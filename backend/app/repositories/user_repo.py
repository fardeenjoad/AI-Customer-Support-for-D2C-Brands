from app.db.supabase import get_db, execute_async
from supabase import Client
from typing import Optional

class UserRepository:
    """
    Repository class handling operations for user accounts inside Supabase.
    Methods run asynchronously in workers to satisfy non-blocking rules.
    """
    def __init__(self):
        self.db: Client = get_db()

    async def create_user(self, user_data: dict) -> Optional[dict]:
        """
        Inserts a new user record.
        Translates password_hash schema column to hashed_password.
        """
        db_data = user_data.copy()
        if "password_hash" in db_data:
            db_data["hashed_password"] = db_data.pop("password_hash")
            
        response = await execute_async(
            lambda: self.db.table("users").insert(db_data).execute()
        )
        if response.data:
            user = response.data[0]
            if "hashed_password" in user:
                user["password_hash"] = user.pop("hashed_password")
            return user
        return None

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """
        Finds a user record by email address.
        """
        response = await execute_async(
            lambda: self.db.table("users").select("*").eq("email", email).execute()
        )
        if response.data:
            user = response.data[0]
            if "hashed_password" in user:
                user["password_hash"] = user.pop("hashed_password")
            return user
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        Finds a user record by primary key user ID.
        """
        response = await execute_async(
            lambda: self.db.table("users").select("*").eq("id", user_id).execute()
        )
        if response.data:
            user = response.data[0]
            if "hashed_password" in user:
                user["password_hash"] = user.pop("hashed_password")
            return user
        return None

