from supabase import create_client, Client
from app.core.config import settings
from anyio.to_thread import run_sync
from typing import Callable, TypeVar

T = TypeVar("T")

class SupabaseDB:
    """
    Database client manager containing the singleton Supabase Client instance.
    """
    _client: Client = None

    @classmethod
    def get_client(cls) -> Client:
        """
        Retrieves or initializes the singleton Supabase client instance.
        """
        if cls._client is None:
            if not settings.SUPABASE_URL or settings.SUPABASE_URL == "https://your-project.supabase.co":
                raise ValueError("SUPABASE_URL is not set or has placeholder value")
            cls._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return cls._client

def get_db() -> Client:
    """
    Dependency helper to retrieve the Supabase client singleton.
    """
    return SupabaseDB.get_client()

async def execute_async(db_operation: Callable[[], T]) -> T:
    """
    Executes a synchronous Supabase client operation asynchronously in an executor thread.
    Helps satisfy the strict requirement to always use async/await.
    """
    return await run_sync(db_operation)
