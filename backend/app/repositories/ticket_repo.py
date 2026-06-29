from app.db.supabase import get_db, execute_async
from supabase import Client
from typing import List, Optional

class TicketRepository:
    """
    Repository class handling operations for tickets inside Supabase.
    Excludes soft-deleted tickets (is_deleted = True) from lists and queries.
    """
    def __init__(self):
        self.db: Client = get_db()

    async def _attach_feedback(self, ticket: dict) -> dict:
        """
        Internal helper to fetch rating/feedback comments from feedback table
        and maps database columns back to API schema keys.
        """
        if not ticket:
            return ticket
        
        # Extract nested join data if present
        customer = ticket.pop("customer", None)
        if isinstance(customer, dict):
            ticket["customer_name"] = customer.get("full_name")
            ticket["customer_email"] = customer.get("email")
        
        brand = ticket.pop("brand", None)
        if isinstance(brand, dict):
            ticket["brand_name"] = brand.get("brand_name")
        
        # Translate assigned_to column back to API schema assigned_agent_id
        if "assigned_to" in ticket:
            ticket["assigned_agent_id"] = ticket.pop("assigned_to")
        else:
            ticket["assigned_agent_id"] = None
            
        ticket_id = ticket.get("id")
        
        
        # Retrieve rating and comments from physical feedback table
        feedback_res = await execute_async(
            lambda: self.db.table("feedback").select("rating", "comment").eq("ticket_id", ticket_id).execute()
        )
        if feedback_res.data:
            fb = feedback_res.data[0]
            ticket["rating"] = fb.get("rating")
            ticket["feedback_comment"] = fb.get("comment")
        else:
            ticket["rating"] = None
            ticket["feedback_comment"] = None
            
        return ticket

    async def create_ticket(self, ticket_data: dict) -> Optional[dict]:
        """
        Asynchronously creates a new ticket.
        """
        db_data = ticket_data.copy()
        if "assigned_agent_id" in db_data:
            db_data["assigned_to"] = db_data.pop("assigned_agent_id")
            
        rating = db_data.pop("rating", None)
        feedback_comment = db_data.pop("feedback_comment", None)

        response = await execute_async(
            lambda: self.db.table("tickets").insert(db_data).execute()
        )
        if response.data:
            ticket = response.data[0]
            
            # If rating or feedback is provided, insert it into the feedback table
            if rating is not None or feedback_comment is not None:
                await execute_async(
                    lambda: self.db.table("feedback").insert({
                        "ticket_id": ticket["id"],
                        "rating": rating,
                        "comment": feedback_comment
                    }).execute()
                )
            return await self.get_ticket_by_id(ticket["id"])
        return None

    async def get_ticket_by_id(self, ticket_id: str) -> Optional[dict]:
        """
        Fetches an active ticket record by primary key ID.
        """
        response = await execute_async(
            lambda: self.db.table("tickets").select("*, customer:users!customer_id(full_name, email), brand:brands(brand_name)").eq("id", ticket_id).eq("is_deleted", False).execute()
        )
        if response.data:
            return await self._attach_feedback(response.data[0])
        return None

    async def list_tickets(
        self,
        brand_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        allowed_brand_ids: Optional[List[str]] = None
    ) -> List[dict]:
        """
        Lists active tickets based on filtering criteria.
        Supports brand/customer scopes.
        """
        def _query():
            builder = self.db.table("tickets").select("*, customer:users!customer_id(full_name, email), brand:brands(brand_name)").eq("is_deleted", False)
            if brand_id:
                builder = builder.eq("brand_id", brand_id)
            if customer_id:
                builder = builder.eq("customer_id", customer_id)
            if status:
                builder = builder.eq("status", status)
            if priority:
                builder = builder.eq("priority", priority)
            if allowed_brand_ids is not None:
                builder = builder.in_("brand_id", allowed_brand_ids)
            builder = builder.order("updated_at", desc=True)
            return builder.execute()

        response = await execute_async(_query)
        if response.data:
            ticket_ids = [t.get("id") for t in response.data if t.get("id")]
            feedback_map = {}
            if ticket_ids:
                feedback_res = await execute_async(
                    lambda: self.db.table("feedback")
                                .select("ticket_id, rating, comment")
                                .in_("ticket_id", ticket_ids)
                                .execute()
                )
                if feedback_res.data:
                    feedback_map = {fb.get("ticket_id"): fb for fb in feedback_res.data if fb.get("ticket_id")}

            final_results = []
            for t in response.data:
                # Extract nested join data if present
                customer = t.pop("customer", None)
                if isinstance(customer, dict):
                    t["customer_name"] = customer.get("full_name")
                    t["customer_email"] = customer.get("email")
                
                brand = t.pop("brand", None)
                if isinstance(brand, dict):
                    t["brand_name"] = brand.get("brand_name")

                # Translate assigned_to column back to API schema assigned_agent_id
                if "assigned_to" in t:
                    t["assigned_agent_id"] = t.pop("assigned_to")
                else:
                    t["assigned_agent_id"] = None
                
                fb = feedback_map.get(t.get("id"))
                if fb:
                    t["rating"] = fb.get("rating")
                    t["feedback_comment"] = fb.get("comment")
                else:
                    t["rating"] = None
                    t["feedback_comment"] = None
                final_results.append(t)
            return final_results
        return []

    async def update_ticket(self, ticket_id: str, update_data: dict) -> Optional[dict]:
        """
        Updates fields on an active ticket.
        """
        db_data = update_data.copy()
        if "assigned_agent_id" in db_data:
            db_data["assigned_to"] = db_data.pop("assigned_agent_id")
            
        rating = db_data.pop("rating", None)
        feedback_comment = db_data.pop("feedback_comment", None)

        response = await execute_async(
            lambda: self.db.table("tickets").update(db_data).eq("id", ticket_id).eq("is_deleted", False).execute()
        )
        if response.data:
            ticket = response.data[0]
            
            # Upsert feedback if provided
            if rating is not None or feedback_comment is not None:
                fb_res = await execute_async(
                    lambda: self.db.table("feedback").select("id").eq("ticket_id", ticket_id).execute()
                )
                if fb_res.data:
                    fb_id = fb_res.data[0]["id"]
                    fb_update = {}
                    if rating is not None:
                        fb_update["rating"] = rating
                    if feedback_comment is not None:
                        fb_update["comment"] = feedback_comment
                    await execute_async(
                        lambda: self.db.table("feedback").update(fb_update).eq("id", fb_id).execute()
                    )
                else:
                    await execute_async(
                        lambda: self.db.table("feedback").insert({
                            "ticket_id": ticket_id,
                            "rating": rating,
                            "comment": feedback_comment
                        }).execute()
                    )
            return await self.get_ticket_by_id(ticket_id)
        return None

    async def soft_delete_ticket(self, ticket_id: str) -> bool:
        """
        Sets is_deleted flag to True (soft deletion).
        """
        response = await execute_async(
            lambda: self.db.table("tickets").update({"is_deleted": True}).eq("id", ticket_id).execute()
        )
        return len(response.data) > 0 if response.data else False

