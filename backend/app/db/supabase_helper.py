import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_client() -> Client:
    """
    Initializes and returns a Supabase client.
    Raises ValueError if keys are not set or contain placeholders.
    """
    if not SUPABASE_URL or SUPABASE_URL == "your_supabase_url":
        raise ValueError("SUPABASE_URL is not set or has placeholder value in .env")
    if not SUPABASE_KEY or SUPABASE_KEY == "your_supabase_anon_key":
        raise ValueError("SUPABASE_KEY is not set or has placeholder value in .env")
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)
