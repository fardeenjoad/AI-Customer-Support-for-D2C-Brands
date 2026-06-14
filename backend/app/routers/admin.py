from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

from app.repositories.ticket_repo import TicketRepository
from app.repositories.brand_repo import BrandRepository
from app.repositories.user_repo import UserRepository
from app.services.email_service import EmailService
from app.models.schemas import TicketResponse, ResponseEnvelope, TokenData, BrandCreate, BrandResponse, BrandUpdate
from app.core.dependencies import require_admin, require_admin_or_agent
from app.db.supabase import get_db, execute_async
from app.core.limiter import limiter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token

optional_security = HTTPBearer(auto_error=False)

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security)
) -> Optional[TokenData]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        if payload is None:
            return None
        user_id = payload.get("user_id")
        email = payload.get("email")
        role = payload.get("role")
        brand_id = payload.get("brand_id")
        if user_id is None or email is None or role is None:
            return None
        return TokenData(user_id=user_id, email=email, role=role, brand_id=brand_id)
    except Exception:
        return None


router = APIRouter(prefix="/admin", tags=["Admin Operations"])

# Request payload for ticket assignment
class AssignTicketRequest(BaseModel):
    ticket_id: str = Field(..., description="UUID of the ticket to be assigned")
    agent_id: str = Field(..., description="UUID of the agent to assign the ticket to")

# Analytics payload representation
class AnalyticsResponse(BaseModel):
    brand_name: Optional[str] = None
    total_tickets: Optional[int] = None
    total_today: int
    total_week: int
    total_month: int
    avg_resolution_time_hours: Optional[float] = None
    tickets_by_status: Dict[str, int]
    tickets_by_sentiment: Dict[str, int]
    most_common_intents: Dict[str, int]

# Dependency helper for EmailService
def get_email_service(
    user_repo: UserRepository = Depends(),
    brand_repo: BrandRepository = Depends(),
    ticket_repo: TicketRepository = Depends()
) -> EmailService:
    return EmailService(user_repo, brand_repo, ticket_repo)

def parse_datetime(val) -> datetime:
    """Helper to parse datetime values returned from DB (string or datetime)."""
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    val_str = str(val)
    if val_str.endswith("Z"):
        val_str = val_str[:-1] + "+00:00"
    dt = datetime.fromisoformat(val_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def classify_intent_heuristic(subject: str) -> str:
    """Simple offline keyword classifier for ticket intents."""
    subj_lower = subject.lower()
    if any(w in subj_lower for w in ["refund", "cancel", "money"]):
        return "refund"
    if any(w in subj_lower for w in ["broken", "damaged", "worst", "bad", "hate", "terrible", "defect"]):
        return "complaint"
    if any(w in subj_lower for w in ["what", "how", "where", "info", "query", "question", "shipping", "delivery"]):
        return "query"
    return "general"

@router.get("/tickets", response_model=ResponseEnvelope[List[TicketResponse]])
@limiter.limit("30/minute")
async def get_admin_tickets(
    request: Request,
    page: int = 1,
    limit: int = 10,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    brand_filter: Optional[str] = None,
    current_user: TokenData = Depends(require_admin),
    ticket_repo: TicketRepository = Depends()
) -> ResponseEnvelope[List[TicketResponse]]:
    """
    Lists support tickets with pagination and optional filters.
    Access restricted to Admin role.
    """
    try:
        results = await ticket_repo.list_tickets(
            brand_id=brand_filter,
            status=status_filter,
            priority=priority_filter
        )

        # Apply Python slicing for pagination (limit, page)
        start = (page - 1) * limit
        end = start + limit
        paginated_results = results[start:end]

        response_data = [TicketResponse.model_validate(t) for t in paginated_results]
        return ResponseEnvelope[List[TicketResponse]](
            success=True,
            data=response_data,
            message="Tickets retrieved successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Admin tickets list error: {str(e)}"
        )


@router.post("/assign", response_model=ResponseEnvelope[TicketResponse])
@limiter.limit("10/minute")
async def assign_ticket(
    request: Request,
    payload: AssignTicketRequest,
    current_user: TokenData = Depends(require_admin_or_agent),
    ticket_repo: TicketRepository = Depends(),
    user_repo: UserRepository = Depends(),
    email_service: EmailService = Depends(get_email_service)
) -> ResponseEnvelope[TicketResponse]:
    """
    Assigns a ticket to a support agent and dispatches an assignment email alert.
    Accessible to admins and agents.
    """
    try:
        # 1. Retrieve ticket
        ticket = await ticket_repo.get_ticket_by_id(payload.ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found."
            )

        db = get_db()
        ticket_brand_id = ticket.get("brand_id")

        # 1.5. Scoping check if the caller is an agent
        if current_user.role == "agent":
            caller_brands = await execute_async(
                lambda: db.table("agent_brands")
                          .select("brand_id")
                          .eq("agent_id", current_user.user_id)
                          .eq("brand_id", ticket_brand_id)
                          .execute()
            )
            if not caller_brands.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to assign tickets from this brand."
                )

        # 2. Retrieve agent user details
        agent = await user_repo.get_user_by_id(payload.agent_id)
        if not agent or agent.get("role") != "agent":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid agent ID or user is not a support agent."
            )

        # 3. Verify agent has access to the ticket's brand
        agent_brands = await execute_async(
            lambda: db.table("agent_brands")
                      .select("brand_id")
                      .eq("agent_id", payload.agent_id)
                      .eq("brand_id", ticket_brand_id)
                      .execute()
        )
        if not agent_brands.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent is not authorized to manage the brand of this ticket."
            )

        # 4. Update assignment and set status to in_progress
        update_data = {
            "assigned_agent_id": payload.agent_id,
            "status": "in_progress",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        updated = await ticket_repo.update_ticket(payload.ticket_id, update_data)

        # 5. Dispatch HTML assignment email
        await email_service.send_agent_assigned(
            agent_email=agent.get("email"),
            ticket_id=payload.ticket_id
        )

        return ResponseEnvelope[TicketResponse](
            success=True,
            data=TicketResponse.model_validate(updated),
            message="Ticket assigned to agent successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket delegation error: {str(e)}"
        )

@router.get("/analytics", response_model=ResponseEnvelope[AnalyticsResponse])
@limiter.limit("20/minute")
async def get_admin_analytics(
    request: Request,
    brand_id: Optional[str] = None,
    current_user: TokenData = Depends(require_admin),
    ticket_repo: TicketRepository = Depends(),
    brand_repo: BrandRepository = Depends()
) -> ResponseEnvelope[AnalyticsResponse]:
    """
    Computes dashboard analytics metrics:
    - total tickets today/week/month
    - average resolution time (hours)
    - tickets status counts
    - tickets sentiment splits
    - most common intents (refund, complaint, query, general)
    """
    try:
        # Retrieve all active tickets
        tickets = await ticket_repo.list_tickets(brand_id=brand_id)

        now_time = datetime.now(timezone.utc)
        
        total_today = 0
        total_week = 0
        total_month = 0
        
        resolution_durations = []
        tickets_by_status = {"open": 0, "in_progress": 0, "resolved": 0}
        tickets_by_sentiment = {"positive": 0, "neutral": 0, "negative": 0}
        most_common_intents = {"refund": 0, "complaint": 0, "query": 0, "general": 0}

        brand_name_display = "Global"
        if brand_id:
            brand_record = await brand_repo.get_brand_by_id(brand_id)
            if brand_record:
                brand_name_display = brand_record.get("brand_name", "Unknown")

        for t in tickets:
            created_at = parse_datetime(t.get("created_at"))
            age = now_time - created_at

            # Calculate intervals
            if age <= timedelta(days=1):
                total_today += 1
            if age <= timedelta(days=7):
                total_week += 1
            if age <= timedelta(days=30):
                total_month += 1

            # Count status
            stat = t.get("status", "open")
            if stat in tickets_by_status:
                tickets_by_status[stat] += 1

            # Count sentiment
            sent = t.get("sentiment", "neutral")
            if sent in tickets_by_sentiment:
                tickets_by_sentiment[sent] += 1

            # Count intents (heuristics over subject)
            intent = classify_intent_heuristic(t.get("subject", ""))
            if intent in most_common_intents:
                most_common_intents[intent] += 1

            # Resolution time calculation
            if stat == "resolved":
                updated_at = parse_datetime(t.get("updated_at"))
                duration = updated_at - created_at
                resolution_durations.append(duration.total_seconds() / 3600.0) # hours

        avg_res_time = sum(resolution_durations) / len(resolution_durations) if resolution_durations else None

        data_payload = AnalyticsResponse(
            brand_name=brand_name_display,
            total_tickets=len(tickets),
            total_today=total_today,
            total_week=total_week,
            total_month=total_month,
            avg_resolution_time_hours=avg_res_time,
            tickets_by_status=tickets_by_status,
            tickets_by_sentiment=tickets_by_sentiment,
            most_common_intents=most_common_intents
        )

        return ResponseEnvelope[AnalyticsResponse](
            success=True,
            data=data_payload,
            message="Analytics computed successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics calculation error: {str(e)}"
        )

@router.get("/alerts", response_model=ResponseEnvelope[List[TicketResponse]])
@limiter.limit("20/minute")
async def get_admin_alerts(
    request: Request,
    page: int = 1,
    limit: int = 10,
    current_user: TokenData = Depends(require_admin_or_agent),
    ticket_repo: TicketRepository = Depends()
) -> ResponseEnvelope[List[TicketResponse]]:
    """
    Lists unresolved tickets older than 24 hours, scoped to the caller's role.
    """
    try:
        allowed_brand_ids = None
        if current_user.role == "agent":
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []

        all_tickets = await ticket_repo.list_tickets(allowed_brand_ids=allowed_brand_ids)
        now_time = datetime.now(timezone.utc)
        alert_tickets = []

        for t in all_tickets:
            if t.get("status") != "resolved":
                created_at = parse_datetime(t.get("created_at"))
                if now_time - created_at > timedelta(hours=24):
                    alert_tickets.append(t)

        start = (page - 1) * limit
        end = start + limit
        paginated_alerts = alert_tickets[start:end]

        response_data = [TicketResponse.model_validate(t) for t in paginated_alerts]
        return ResponseEnvelope[List[TicketResponse]](
            success=True,
            data=response_data,
            message="Overdue unresolved tickets retrieved successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Alert ticket retrieval error: {str(e)}"
        )

@router.get("/agents", response_model=ResponseEnvelope[List[Dict[str, Any]]])
@limiter.limit("20/minute")
async def list_agents(
    request: Request,
    brand_id: Optional[str] = None,
    current_user: TokenData = Depends(require_admin_or_agent),
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[List[Dict[str, Any]]]:
    """
    Lists all support agents, optionally filtered by brand ID.
    Accessible to admins and agents.
    """
    try:
        db = get_db()
        if brand_id:
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("agent_id").eq("brand_id", brand_id).execute()
            )
            agent_ids = [row.get("agent_id") for row in agent_brands.data] if agent_brands.data else []
            if agent_ids:
                response = await execute_async(
                    lambda: db.table("users").select("id", "email", "full_name", "role").eq("role", "agent").in_("id", agent_ids).execute()
                )
                agents = response.data if response.data else []
            else:
                agents = []
        else:
            response = await execute_async(
                lambda: db.table("users").select("id", "email", "full_name", "role").eq("role", "agent").execute()
            )
            agents = response.data if response.data else []

        return ResponseEnvelope[List[Dict[str, Any]]](
            success=True,
            data=agents,
            message="Agents list retrieved successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent list lookup failed: {str(e)}"
        )

# ----------------- Brand CRUD Administration Endpoints -----------------


@router.post("/brands", response_model=ResponseEnvelope[BrandResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_admin_brand(
    request: Request,
    payload: BrandCreate,
    current_user: TokenData = Depends(require_admin),
    brand_repo: BrandRepository = Depends()
) -> ResponseEnvelope[BrandResponse]:
    """
    Creates a new D2C Brand configuration in the system.
    Restricted to Admins.
    """
    try:
        all_brands = await brand_repo.list_brands()
        for b in all_brands:
            if b.get("brand_name").lower() == payload.brand_name.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Brand name already exists."
                )

        brand_data = {
            "brand_name": payload.brand_name,
            "faqs": [faq.model_dump() for faq in payload.faqs],
            "tone": payload.tone,
            "email_config": payload.email_config,
            "custom_greeting": payload.custom_greeting
        }
        created = await brand_repo.create_brand(brand_data)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create brand configuration."
            )
        return ResponseEnvelope[BrandResponse](
            success=True,
            data=BrandResponse.model_validate(created),
            message="Brand configuration created successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Brand creation error: {str(e)}"
        )

@router.get("/brands", response_model=ResponseEnvelope[List[BrandResponse]])
@limiter.limit("30/minute")
async def get_admin_brands(
    request: Request,
    page: int = 1,
    limit: int = 10,
    public: bool = False,
    current_user: Optional[TokenData] = Depends(get_optional_user),
    brand_repo: BrandRepository = Depends()
) -> ResponseEnvelope[List[BrandResponse]]:
    """
    Lists registered D2C Brand configurations with pagination.
    Accessible publicly (for registration) and to Admins/Agents.
    """
    try:
        if current_user and current_user.role == "agent" and not public:
            db = get_db()
            agent_brands = await execute_async(
                lambda: db.table("agent_brands").select("brand_id").eq("agent_id", current_user.user_id).execute()
            )
            allowed_brand_ids = [row.get("brand_id") for row in agent_brands.data] if agent_brands.data else []
            if allowed_brand_ids:
                brands_response = await execute_async(
                    lambda: db.table("brands").select("*").in_("id", allowed_brand_ids).execute()
                )
                brands = brands_response.data if brands_response.data else []
            else:
                brands = []
        else:
            brands = await brand_repo.list_brands()

        start = (page - 1) * limit
        end = start + limit
        paginated_brands = brands[start:end]
        
        response_data = [BrandResponse.model_validate(b) for b in paginated_brands]
        return ResponseEnvelope[List[BrandResponse]](
            success=True,
            data=response_data,
            message="Brands retrieved successfully."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Brands retrieval error: {str(e)}"
        )

@router.get("/brands/{brand_id}", response_model=ResponseEnvelope[BrandResponse])
@limiter.limit("30/minute")
async def get_admin_brand_by_id(
    request: Request,
    brand_id: str,
    brand_repo: BrandRepository = Depends()
) -> ResponseEnvelope[BrandResponse]:
    """
    Retrieves configuration details for a single brand by ID.
    Publicly accessible (used by customer portal and chat widget).
    """
    try:
        brand = await brand_repo.get_brand_by_id(brand_id)
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand configuration not found."
            )
        return ResponseEnvelope[BrandResponse](
            success=True,
            data=BrandResponse.model_validate(brand),
            message="Brand configuration retrieved successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Brand retrieval error: {str(e)}"
        )

@router.put("/brands/{brand_id}", response_model=ResponseEnvelope[BrandResponse])
@limiter.limit("10/minute")
async def update_admin_brand(
    request: Request,
    brand_id: str,
    payload: BrandUpdate,
    current_user: TokenData = Depends(require_admin),
    brand_repo: BrandRepository = Depends()
) -> ResponseEnvelope[BrandResponse]:
    """
    Updates an existing D2C Brand configuration by ID.
    Restricted to Admins.
    """
    try:
        brand = await brand_repo.get_brand_by_id(brand_id)
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand configuration not found."
            )

        update_data = {}
        if payload.brand_name is not None:
            if payload.brand_name.lower() != brand.get("brand_name").lower():
                all_brands = await brand_repo.list_brands()
                for b in all_brands:
                    if b.get("brand_name").lower() == payload.brand_name.lower():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Brand name already exists."
                        )
            update_data["brand_name"] = payload.brand_name
        if payload.faqs is not None:
            update_data["faqs"] = [faq.model_dump() for faq in payload.faqs]
        if payload.tone is not None:
            update_data["tone"] = payload.tone
        if payload.email_config is not None:
            update_data["email_config"] = payload.email_config
        if payload.custom_greeting is not None:
            update_data["custom_greeting"] = payload.custom_greeting

        if not update_data:
            return ResponseEnvelope[BrandResponse](
                success=True,
                data=BrandResponse.model_validate(brand),
                message="No updates applied."
            )

        updated = await brand_repo.update_brand(brand_id, update_data)
        return ResponseEnvelope[BrandResponse](
            success=True,
            data=BrandResponse.model_validate(updated),
            message="Brand configuration updated successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Brand update error: {str(e)}"
        )

@router.delete("/brands/{brand_id}", response_model=ResponseEnvelope[dict])
@limiter.limit("10/minute")
async def delete_admin_brand(
    request: Request,
    brand_id: str,
    current_user: TokenData = Depends(require_admin),
    brand_repo: BrandRepository = Depends()
) -> ResponseEnvelope[dict]:
    """
    Deletes a registered D2C Brand configuration by ID.
    Restricted to Admins.
    """
    try:
        brand = await brand_repo.get_brand_by_id(brand_id)
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand configuration not found."
            )

        success = await brand_repo.delete_brand(brand_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete brand configuration."
            )
        return ResponseEnvelope[dict](
            success=True,
            data={"brand_id": brand_id},
            message="Brand configuration deleted successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Brand deletion error: {str(e)}"
        )

