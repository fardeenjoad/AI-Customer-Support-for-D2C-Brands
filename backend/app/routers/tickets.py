from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from app.repositories.ticket_repo import TicketRepository
from app.repositories.message_repo import MessageRepository
from app.repositories.user_repo import UserRepository
from app.repositories.brand_repo import BrandRepository
from app.services.email_service import EmailService
from app.services.s3_service import S3Service
from app.services.ai_service import AIService
from app.services.sentiment_service import SentimentService
from app.db.supabase import get_db, execute_async
from app.models.schemas import (
    TicketCreate, TicketUpdate, TicketResponse, MessageResponse, 
    ResponseEnvelope, TokenData,
    PortalTicketCreate, PortalMessageCreate, PortalFeedbackCreate,
    TicketReply
)
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_admin_or_agent
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.limiter import limiter


router = APIRouter(prefix="/tickets", tags=["Tickets"])

def get_email_service(
    user_repo: UserRepository = Depends(),
    brand_repo: BrandRepository = Depends()
) -> EmailService:
    return EmailService(user_repo, brand_repo)

# ────────────────────────────────────────────────────────────────
#  Passwordless Customer Portal Endpoints
# ────────────────────────────────────────────────────────────────

@router.get("/portal/lookup", response_model=ResponseEnvelope[List[TicketResponse]])
@limiter.limit("15/minute")
async def portal_lookup_tickets(
    request: Request,
    email: str,
    ticket_repo: TicketRepository = Depends(),
    user_repo: UserRepository = Depends(),
    message_repo: MessageRepository = Depends()
) -> ResponseEnvelope[List[TicketResponse]]:
    """
    Public lookup to retrieve all tickets for a customer email.
    """
    try:
        user = await user_repo.get_user_by_email(email)
        if not user:
            return ResponseEnvelope[List[TicketResponse]](
                success=True,
                data=[],
                message="No tickets found for this email."
            )
        
        tickets = await ticket_repo.list_tickets(customer_id=user["id"])
        
        # Attach last message preview to each ticket
        response_data = []
        for t in tickets:
            msgs = await message_repo.list_messages_by_ticket(t["id"])
            last_msg = msgs[-1]["content"] if msgs else ""
            
            # Map database keys to schema keys
            t_copy = t.copy()
            t_copy["last_message_preview"] = last_msg
            response_data.append(TicketResponse.model_validate(t_copy))
            
        return ResponseEnvelope[List[TicketResponse]](
            success=True,
            data=response_data,
            message="Tickets retrieved successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lookup failed: {str(e)}"
        )

@router.get("/portal/{ticket_id}", response_model=ResponseEnvelope[Dict[str, Any]])
@limiter.limit("20/minute")
async def portal_get_ticket_details(
    request: Request,
    ticket_id: str,
    email: str,
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends(),
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[Dict[str, Any]]:
    """
    Retrieves details and messages for a specific ticket, verified by customer email.
    """
    try:
        user = await user_repo.get_user_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="Customer not found.")
            
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found.")
            
        if ticket.get("customer_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied to this ticket.")
            
        messages = await message_repo.list_messages_by_ticket(ticket_id)
        
        data_payload = {
            "ticket": TicketResponse.model_validate(ticket),
            "messages": [MessageResponse.model_validate(m) for m in messages]
        }
        
        return ResponseEnvelope[Dict[str, Any]](
            success=True,
            data=data_payload,
            message="Ticket details retrieved."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ticket: {str(e)}"
        )

@router.post("/portal/create", response_model=ResponseEnvelope[TicketResponse])
@limiter.limit("5/minute")
async def portal_create_ticket(
    request: Request,
    payload: PortalTicketCreate,
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends(),
    user_repo: UserRepository = Depends(),
    brand_repo: BrandRepository = Depends(),
    ai_service: AIService = Depends(),
    sentiment_service: SentimentService = Depends(),
    email_service: EmailService = Depends(get_email_service)
) -> ResponseEnvelope[TicketResponse]:
    """
    Creates a user dynamically if not registered, and opens a new support ticket.
    """
    try:
        # 1. Retrieve or auto-create customer user
        user = await user_repo.get_user_by_email(payload.email)
        if not user:
            # Auto-register under the provided brand
            dummy_pwd = await get_password_hash("passwordless_default_hash_value")
            user_data = {
                "email": payload.email,
                "password_hash": dummy_pwd,
                "role": "customer",
                "brand_id": payload.brand_id,
                "full_name": payload.email.split("@")[0]
            }
            user = await user_repo.create_user(user_data)
            if not user:
                raise HTTPException(status_code=500, detail="Failed to initialize customer record.")
                
        # 2. Build and create ticket
        ticket_data = {
            "customer_id": user["id"],
            "brand_id": payload.brand_id,
            "subject": payload.subject,
            "status": "open",
            "priority": "low",
            "sentiment": "neutral"
        }
        
        created_ticket = await ticket_repo.create_ticket(ticket_data)
        if not created_ticket:
            raise HTTPException(status_code=500, detail="Failed to create ticket record.")
            
        ticket_id = created_ticket["id"]
        
        # 3. Save initial message
        message_data = {
            "ticket_id": ticket_id,
            "sender": "customer",
            "content": payload.initial_message
        }
        await message_repo.create_message(message_data)
        
        # 4. Dispatch notification email
        await email_service.send_ticket_created(
            customer_email=payload.email,
            ticket_id=ticket_id
        )

        # 5. AI Auto-Reply: Analyze sentiment, detect intent, generate reply
        try:
            brand = await brand_repo.get_brand_by_id(payload.brand_id)
            if brand:
                # Sentiment & Intent analysis
                sentiment = await sentiment_service.analyze_sentiment(payload.initial_message)
                intent = await ai_service.detect_intent(payload.initial_message)

                # Priority rules
                new_priority = "low"
                if sentiment == "negative" or intent == "refund":
                    new_priority = "high"
                if sentiment == "negative" and intent == "refund":
                    new_priority = "urgent"

                # Check if escalation is needed
                should_escalate = sentiment == "negative" or intent in ["complaint", "refund"]

                if should_escalate:
                    escalation_reply = (
                        "I have escalated your ticket to our customer support representatives. "
                        "An agent has been alerted and will respond shortly."
                    )
                    await message_repo.create_message({
                        "ticket_id": ticket_id,
                        "sender": "ai",
                        "content": escalation_reply
                    })
                    await ticket_repo.update_ticket(ticket_id, {
                        "priority": new_priority,
                        "sentiment": sentiment,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
                else:
                    # Generate AI reply using brand context
                    history = await message_repo.list_messages_by_ticket(ticket_id)
                    reply = await ai_service.generate_reply(
                        customer_message=payload.initial_message,
                        brand_context=brand,
                        message_history=history[:-1] if len(history) > 1 else []
                    )
                    await message_repo.create_message({
                        "ticket_id": ticket_id,
                        "sender": "ai",
                        "content": reply
                    })
                    await ticket_repo.update_ticket(ticket_id, {
                        "sentiment": sentiment,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
        except Exception:
            # AI reply is best-effort; ticket creation still succeeds
            pass

        return ResponseEnvelope[TicketResponse](
            success=True,
            data=TicketResponse.model_validate(created_ticket),
            message="Ticket created successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit ticket: {str(e)}"
        )

@router.post("/portal/{ticket_id}/reply", response_model=ResponseEnvelope[MessageResponse])
@limiter.limit("10/minute")
async def portal_add_reply(
    request: Request,
    ticket_id: str,
    payload: PortalMessageCreate,
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends(),
    user_repo: UserRepository = Depends(),
    brand_repo: BrandRepository = Depends(),
    ai_service: AIService = Depends(),
    sentiment_service: SentimentService = Depends()
) -> ResponseEnvelope[MessageResponse]:
    """
    Submits a customer reply to the ticket thread, verified by email.
    Automatically generates an AI reply based on the customer's message.
    """
    try:
        user = await user_repo.get_user_by_email(payload.email)
        if not user:
            raise HTTPException(status_code=404, detail="Customer profile not found.")
            
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found.")
            
        if ticket.get("customer_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied.")
            
        # Add customer message
        message_data = {
            "ticket_id": ticket_id,
            "sender": "customer",
            "content": payload.content
        }
        created_msg = await message_repo.create_message(message_data)
        
        # Update updated_at of the ticket
        await ticket_repo.update_ticket(ticket_id, {
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

        # AI Auto-Reply on every customer message
        try:
            brand_id = ticket.get("brand_id")
            brand = await brand_repo.get_brand_by_id(brand_id) if brand_id else None
            if brand:
                # Sentiment & Intent analysis
                sentiment = await sentiment_service.analyze_sentiment(payload.content)
                intent = await ai_service.detect_intent(payload.content)

                # Priority rules
                current_priority = ticket.get("priority", "low")
                new_priority = current_priority
                if sentiment == "negative" or intent == "refund":
                    new_priority = "high"
                if sentiment == "negative" and intent == "refund":
                    new_priority = "urgent"

                # Check if escalation is needed
                should_escalate = sentiment == "negative" or intent in ["complaint", "refund"]

                if should_escalate:
                    escalation_reply = (
                        "I have escalated your ticket to our customer support representatives. "
                        "An agent has been alerted and will respond shortly."
                    )
                    await message_repo.create_message({
                        "ticket_id": ticket_id,
                        "sender": "ai",
                        "content": escalation_reply
                    })
                    await ticket_repo.update_ticket(ticket_id, {
                        "priority": new_priority,
                        "sentiment": sentiment,
                        "status": "open",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
                else:
                    # Generate AI reply using brand context + conversation history
                    history = await message_repo.list_messages_by_ticket(ticket_id)
                    reply = await ai_service.generate_reply(
                        customer_message=payload.content,
                        brand_context=brand,
                        message_history=history[:-1] if len(history) > 1 else []
                    )
                    await message_repo.create_message({
                        "ticket_id": ticket_id,
                        "sender": "ai",
                        "content": reply
                    })
                    await ticket_repo.update_ticket(ticket_id, {
                        "sentiment": sentiment,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
        except Exception:
            # AI reply is best-effort; customer reply still succeeds
            pass
        
        return ResponseEnvelope[MessageResponse](
            success=True,
            data=MessageResponse.model_validate(created_msg),
            message="Reply added successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reply error: {str(e)}"
        )

@router.post("/portal/{ticket_id}/feedback", response_model=ResponseEnvelope[TicketResponse])
@limiter.limit("5/minute")
async def portal_submit_feedback(
    request: Request,
    ticket_id: str,
    payload: PortalFeedbackCreate,
    ticket_repo: TicketRepository = Depends(),
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[TicketResponse]:
    """
    Submits customer satisfaction rating & comment on a resolved ticket, verified by email.
    """
    try:
        user = await user_repo.get_user_by_email(payload.email)
        if not user:
            raise HTTPException(status_code=404, detail="Customer profile not found.")
            
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found.")
            
        if ticket.get("customer_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied.")
            
        # Update ticket rating & comment
        updated_ticket = await ticket_repo.update_ticket(ticket_id, {
            "rating": payload.rating,
            "feedback_comment": payload.comment
        })
        
        return ResponseEnvelope[TicketResponse](
            success=True,
            data=TicketResponse.model_validate(updated_ticket),
            message="Feedback submitted successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feedback submission failed: {str(e)}"
        )

@router.post("", response_model=ResponseEnvelope[TicketResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_new_ticket(
    request: Request,
    payload: TicketCreate,
    current_user: TokenData = Depends(get_current_user),
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends(),
    email_service: EmailService = Depends(get_email_service)
) -> ResponseEnvelope[TicketResponse]:
    """
    Creates a new support ticket and logs the initial customer message.
    """
    try:
        # 1. Enforce brand scoping for customer users
        if current_user.role == "customer" and payload.brand_id != current_user.brand_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers can only open tickets for their assigned brand."
            )

        ticket_data = {
            "customer_id": current_user.user_id,
            "brand_id": payload.brand_id,
            "subject": payload.subject,
            "status": "open",
            "priority": "low",
            "sentiment": "neutral"
        }

        created_ticket = await ticket_repo.create_ticket(ticket_data)
        if not created_ticket:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create ticket record."
            )

        ticket_id = created_ticket.get("id")

        # 2. Save initial message
        message_data = {
            "ticket_id": ticket_id,
            "sender": "customer",
            "content": payload.initial_message
        }
        await message_repo.create_message(message_data)

        # 3. Send email notification
        await email_service.send_ticket_created(
            customer_email=current_user.email,
            ticket_id=ticket_id
        )

        return ResponseEnvelope[TicketResponse](
            success=True,
            data=TicketResponse.model_validate(created_ticket),
            message="Ticket created successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket creation error: {str(e)}"
        )

@router.get("", response_model=ResponseEnvelope[List[TicketResponse]])
@limiter.limit("20/minute")
async def list_tickets(
    request: Request,
    page: int = 1,
    limit: int = 10,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    brand_filter: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user),
    ticket_repo: TicketRepository = Depends()
) -> ResponseEnvelope[List[TicketResponse]]:
    """
    Retrieves a list of tickets scoped based on user role:
    - Customer: Only their own tickets.
    - Agent: Scoped to brand(s) they manage.
    - Admin: Unscoped (views all).
    """
    try:
        brand_id = brand_filter
        customer_id = None
        allowed_brand_ids = None

        if current_user.role == "customer":
            customer_id = current_user.user_id
            brand_id = current_user.brand_id  # Enforce customer brand scoping
        elif current_user.role == "agent":
            # Retrieve agent brand relationships
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            
            if brand_filter:
                if brand_filter not in allowed_brand_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not authorized to access tickets for this brand."
                    )
                brand_id = brand_filter
        else:
            # Admin role handles brand filter directly
            brand_id = brand_filter

        results = await ticket_repo.list_tickets(
            brand_id=brand_id,
            customer_id=customer_id,
            status=status_filter,
            priority=priority_filter,
            allowed_brand_ids=allowed_brand_ids
        )

        start = (page - 1) * limit
        end = start + limit
        paginated_results = results[start:end]

        response_data = [TicketResponse.model_validate(t) for t in paginated_results]
        return ResponseEnvelope[List[TicketResponse]](
            success=True,
            data=response_data,
            message="Tickets retrieved successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket list retrieval error: {str(e)}"
        )


@router.get("/{ticket_id}", response_model=ResponseEnvelope[Dict[str, Any]])
@limiter.limit("30/minute")
async def get_ticket_details(
    request: Request,
    ticket_id: str,
    current_user: TokenData = Depends(get_current_user),
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends()
) -> ResponseEnvelope[Dict[str, Any]]:
    """
    Fetches ticket details along with full message thread history.
    """
    try:
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found."
            )

        # Scoping Authorization Check
        if current_user.role == "customer":
            if ticket.get("customer_id") != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to view this ticket."
                )
        elif current_user.role == "agent":
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            if ticket.get("brand_id") not in allowed_brand_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to view tickets from this brand."
                )

        messages = await message_repo.list_messages_by_ticket(ticket_id)

        data_payload = {
            "ticket": TicketResponse.model_validate(ticket),
            "messages": [MessageResponse.model_validate(m) for m in messages]
        }

        return ResponseEnvelope[Dict[str, Any]](
            success=True,
            data=data_payload,
            message="Ticket details retrieved successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket detail retrieval error: {str(e)}"
        )

@router.put("/{ticket_id}", response_model=ResponseEnvelope[TicketResponse])
@limiter.limit("20/minute")
async def update_ticket(
    request: Request,
    ticket_id: str,
    payload: TicketUpdate,
    current_user: TokenData = Depends(require_admin_or_agent),
    ticket_repo: TicketRepository = Depends(),
    user_repo: UserRepository = Depends(),
    email_service: EmailService = Depends(get_email_service)
) -> ResponseEnvelope[TicketResponse]:
    """
    Updates properties (status, priority, assignment) of a ticket.
    Accessible only to agents and admins.
    """
    try:
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found."
            )

        # Scoping check for agents
        if current_user.role == "agent":
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            if ticket.get("brand_id") not in allowed_brand_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to update tickets from this brand."
                )

        # Check if status changes to resolved
        is_resolved_now = False
        if payload.status == "resolved" and ticket.get("status") != "resolved":
            is_resolved_now = True

        # Validate updates
        update_data = {}
        if payload.status:
            if payload.status not in ["open", "in_progress", "resolved"]:
                raise HTTPException(status_code=400, detail="Invalid status value.")
            update_data["status"] = payload.status
        if payload.priority:
            if payload.priority not in ["low", "medium", "high", "urgent"]:
                raise HTTPException(status_code=400, detail="Invalid priority value.")
            update_data["priority"] = payload.priority
        if payload.assigned_agent_id:
            update_data["assigned_agent_id"] = payload.assigned_agent_id

        if not update_data:
            return ResponseEnvelope[TicketResponse](
                success=True,
                data=TicketResponse.model_validate(ticket),
                message="No updates applied."
            )

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        updated = await ticket_repo.update_ticket(ticket_id, update_data)
        
        if is_resolved_now:
            customer = await user_repo.get_user_by_id(ticket.get("customer_id"))
            customer_email = customer.get("email") if customer else None
            if customer_email:
                await email_service.send_ticket_resolved(
                    customer_email=customer_email,
                    ticket_id=ticket_id
                )

        return ResponseEnvelope[TicketResponse](
            success=True,
            data=TicketResponse.model_validate(updated),
            message="Ticket updated successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket update error: {str(e)}"
        )

@router.post("/{ticket_id}/reply", response_model=ResponseEnvelope[MessageResponse])
@limiter.limit("20/minute")
async def add_ticket_reply(
    request: Request,
    ticket_id: str,
    payload: TicketReply,
    current_user: TokenData = Depends(require_admin_or_agent),
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends()
) -> ResponseEnvelope[MessageResponse]:
    """
    Appends an agent/admin reply to the ticket thread.
    """
    try:
        # 1. Fetch ticket to verify existence
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found."
            )

        # 2. Scoping check for agents (admins have access to all brands)
        if current_user.role == "agent":
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            if ticket.get("brand_id") not in allowed_brand_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to access tickets from this brand."
                )

        # 3. Create agent reply message in database
        message_data = {
            "ticket_id": ticket_id,
            "sender": "agent",
            "content": payload.content
        }
        created_msg = await message_repo.create_message(message_data)
        if not created_msg:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save reply message."
            )

        # 4. Update ticket's last updated timestamp
        await ticket_repo.update_ticket(ticket_id, {
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

        return ResponseEnvelope[MessageResponse](
            success=True,
            data=MessageResponse.model_validate(created_msg),
            message="Reply added successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add reply: {str(e)}"
        )

@router.delete("/{ticket_id}", response_model=ResponseEnvelope[dict])
@limiter.limit("10/minute")
async def delete_ticket(
    request: Request,
    ticket_id: str,
    current_user: TokenData = Depends(require_admin_or_agent),
    ticket_repo: TicketRepository = Depends()
) -> ResponseEnvelope[dict]:
    """
    Soft-deletes a ticket by setting is_deleted = True.
    """
    try:
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found."
            )

        # Scoping check for agents
        if current_user.role == "agent":
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            if ticket.get("brand_id") not in allowed_brand_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to delete tickets from this brand."
                )

        success = await ticket_repo.soft_delete_ticket(ticket_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete ticket."
            )

        return ResponseEnvelope[dict](
            success=True,
            data={"ticket_id": ticket_id},
            message="Ticket soft-deleted successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket deletion error: {str(e)}"
        )

@router.post("/{ticket_id}/attachments", response_model=ResponseEnvelope[dict])
@limiter.limit("5/minute")
async def upload_ticket_attachment(
    request: Request,
    ticket_id: str,
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    ticket_repo: TicketRepository = Depends(),
    message_repo: MessageRepository = Depends(),
    s3_service: S3Service = Depends()
) -> ResponseEnvelope[dict]:
    """
    Uploads an attachment file for a ticket. Stores in S3 (or local filesystem fallback)
    and logs a message in the ticket's message history.
    """
    try:
        # 1. Fetch ticket and check permissions
        ticket = await ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found."
            )
            
        # Permission check: customer must own ticket, agent must have brand access
        if current_user.role == "customer" and ticket.get("customer_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this ticket."
            )
        elif current_user.role == "agent":
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            if ticket.get("brand_id") not in allowed_brand_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to access tickets from this brand."
                )

        # 2. Read file content and metadata
        content = await file.read()
        filename = file.filename
        content_type = file.content_type or "application/octet-stream"

        # 3. Upload file via S3Service
        file_url = await s3_service.upload_file(content, filename, content_type)

        # 4. Insert message to log attachment upload
        sender_role = current_user.role
        db_sender = "agent" if sender_role in ["admin", "agent"] else "customer"
        
        message_data = {
            "ticket_id": ticket_id,
            "sender": db_sender,
            "content": f"[Attachment: {filename} ({file_url})]"
        }
        await message_repo.create_message(message_data)

        return ResponseEnvelope[dict](
            success=True,
            data={"filename": filename, "url": file_url},
            message="Attachment uploaded successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Attachment upload error: {str(e)}"
        )

