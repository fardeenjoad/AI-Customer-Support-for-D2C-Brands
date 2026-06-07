from app.db.supabase import get_db, execute_async
from supabase import Client
from typing import List, Optional

class BrandRepository:
    """
    Repository class handling operations for brands inside Supabase.
    """
    def __init__(self):
        self.db: Client = get_db()

    async def get_brand_by_id(self, brand_id: str) -> Optional[dict]:
        """
        Fetches brand configurations (name, FAQs, tone) by primary key ID.
        """
        response = await execute_async(
            lambda: self.db.table("brands").select("*").eq("id", brand_id).execute()
        )
        return response.data[0] if response.data else None

    async def create_brand(self, brand_data: dict) -> Optional[dict]:
        """
        Creates a new D2C Brand configuration inside Supabase.
        """
        response = await execute_async(
            lambda: self.db.table("brands").insert(brand_data).execute()
        )
        return response.data[0] if response.data else None

    async def list_brands(self) -> List[dict]:
        """
        Retrieves all brand configurations.
        """
        response = await execute_async(
            lambda: self.db.table("brands").select("*").execute()
        )
        return response.data if response.data else []

    async def update_brand(self, brand_id: str, brand_data: dict) -> Optional[dict]:
        """
        Updates brand configurations by primary key ID.
        """
        response = await execute_async(
            lambda: self.db.table("brands").update(brand_data).eq("id", brand_id).execute()
        )
        return response.data[0] if response.data else None

    async def delete_brand(self, brand_id: str) -> bool:
        """
        Deletes a brand configuration by primary key ID.
        """
        response = await execute_async(
            lambda: self.db.table("brands").delete().eq("id", brand_id).execute()
        )
        return len(response.data) > 0 if response.data else False
