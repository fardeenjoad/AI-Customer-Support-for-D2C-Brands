from app.db.supabase import get_db, execute_async
from supabase import Client
from typing import List, Optional

class MessageRepository:
    """
    Repository class handling operations for support thread messages inside Supabase.
    """
    def __init__(self):
        self.db: Client = get_db()

    async def list_messages_by_ticket(self, ticket_id: str) -> List[dict]:
        """
        Retrieves all messages for a specific ticket ordered by timestamp.
        """
        response = await execute_async(
            lambda: self.db.table("messages").select("*").eq("ticket_id", ticket_id).order("timestamp").execute()
        )
        return response.data if response.data else []

    async def create_message(self, message_data: dict) -> Optional[dict]:
        """
        Appends a message record to a ticket thread.
        """
        response = await execute_async(
            lambda: self.db.table("messages").insert(message_data).execute()
        )
        return response.data[0] if response.data else None
