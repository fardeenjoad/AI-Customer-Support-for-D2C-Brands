import os
# Configure mock environment variables before importing app
os.environ["SUPABASE_URL"] = "https://mock-supabase-url.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-supabase-anon-key-long-enough-to-be-valid-for-testing"
os.environ["GROQ_API_KEY"] = "gsk_mock_api_key_valid_format_dummy"
os.environ["RESEND_API_KEY"] = "re_mock_api_key"
os.environ["JWT_SECRET"] = "mock_secret_key_long_enough_to_be_secure"

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.user_repo import UserRepository
from app.repositories.ticket_repo import TicketRepository
from app.repositories.brand_repo import BrandRepository
from app.repositories.message_repo import MessageRepository
from app.core.security import get_password_hash
from app.db.supabase import SupabaseDB
from typing import List, Optional

# 1. Setup Mock DB Table queries
class MockSupabaseTable:
    def __init__(self, table_name):
        self.table_name = table_name
        self.filters = {}

    def select(self, *args, **kwargs): return self
    def eq(self, key, val):
        self.filters[key] = val
        return self
    def execute(self):
        class Response:
            def __init__(self, data):
                self.data = data
        if self.table_name == "agent_brands":
            return Response([{"agent_id": "agent_123", "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"}])
        return Response([])

class MockSupabaseClient:
    def table(self, table_name):
        return MockSupabaseTable(table_name)

# 2. Setup Mock Repositories
class MockUserRepository:
    users = {
        "admin_123": {
            "id": "admin_123",
            "email": "admin@ecostyle.com",
            "role": "admin",
            "brand_id": None,
            "created_at": "2026-06-06T12:00:00Z"
        },
        "customer_123": {
            "id": "customer_123",
            "email": "customer@gmail.com",
            "role": "customer",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "created_at": "2026-06-06T12:00:00Z"
        }
    }
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        for u in self.users.values():
            if u["email"] == email:
                return u
        return None
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return self.users.get(user_id)

class MockBrandRepository:
    brands = {
        "f47ac10b-58cc-4372-a567-0e02b2c3d479": {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "brand_name": "EcoStyle",
            "tone": "friendly",
            "faqs": [{"question": "What is return policy?", "answer": "30 days return policy."}],
            "email_config": {},
            "custom_greeting": "Hello! Welcome to EcoStyle Support."
        }
    }
    
    async def create_brand(self, brand_data: dict) -> Optional[dict]:
        brand_id = f"brand_{len(self.brands) + 1}"
        brand = {
            "id": brand_id,
            "brand_name": brand_data.get("brand_name"),
            "tone": brand_data.get("tone", "professional"),
            "faqs": brand_data.get("faqs", []),
            "email_config": brand_data.get("email_config", {}),
            "custom_greeting": brand_data.get("custom_greeting", "Hello!")
        }
        self.brands[brand_id] = brand
        return brand

    async def get_brand_by_id(self, brand_id: str) -> Optional[dict]:
        return self.brands.get(brand_id)

    async def list_brands(self) -> List[dict]:
        return list(self.brands.values())

    async def update_brand(self, brand_id: str, brand_data: dict) -> Optional[dict]:
        b = self.brands.get(brand_id)
        if b:
            b.update(brand_data)
            return b
        return None

    async def delete_brand(self, brand_id: str) -> bool:
        if brand_id in self.brands:
            del self.brands[brand_id]
            return True
        return False

class MockTicketRepository:
    tickets = {
        f"ticket_{i}": {
            "id": f"ticket_{i}",
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": f"Issue #{i}",
            "status": "open",
            "priority": "low",
            "sentiment": "neutral",
            "assigned_agent_id": None,
            "rating": None,
            "feedback_comment": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "is_deleted": False
        } for i in range(1, 16) # 15 tickets for pagination testing
    }
    
    async def get_ticket_by_id(self, ticket_id: str) -> Optional[dict]:
        return self.tickets.get(ticket_id)

    async def list_tickets(self, **kwargs) -> List[dict]:
        return list(self.tickets.values())


class MockMessageRepository:
    async def list_messages_by_ticket(self, ticket_id: str) -> List[dict]:
        return [
            {
                "id": f"msg_{i}",
                "ticket_id": ticket_id,
                "sender": "customer" if i % 2 == 1 else "ai",
                "content": f"Message {i}",
                "timestamp": datetime.now(timezone.utc)
            } for i in range(1, 26) # 25 messages for pagination
        ]

# 3. Setup overrides
@pytest.fixture(autouse=True)
def setup_overrides():
    orig_get_client = SupabaseDB.get_client
    SupabaseDB.get_client = lambda: MockSupabaseClient()
    
    app.dependency_overrides.clear()
    app.dependency_overrides[UserRepository] = lambda: MockUserRepository()
    app.dependency_overrides[BrandRepository] = lambda: MockBrandRepository()
    app.dependency_overrides[TicketRepository] = lambda: MockTicketRepository()
    app.dependency_overrides[MessageRepository] = lambda: MockMessageRepository()
    
    yield
    app.dependency_overrides.clear()
    SupabaseDB.get_client = orig_get_client

@pytest.fixture
def anyio_backend():
    return "asyncio"

client = TestClient(app, raise_server_exceptions=False)

@pytest.mark.anyio
async def test_brand_crud_workflow():
    pwd_hash = await get_password_hash("password123")
    MockUserRepository.users["admin_123"]["password_hash"] = pwd_hash
    MockUserRepository.users["customer_123"]["password_hash"] = pwd_hash

    # Login admin
    login_res = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create brand
    brand_payload = {
        "brand_name": "EcoThread",
        "faqs": [{"question": "Return policy?", "answer": "30 days return."}],
        "tone": "casual",
        "email_config": {},
        "custom_greeting": "Hey there! Welcome to EcoThread support."
    }
    create_res = client.post("/admin/brands", json=brand_payload, headers=headers)
    assert create_res.status_code == 201
    assert create_res.json()["success"] is True
    brand_id = create_res.json()["data"]["id"]
    assert create_res.json()["data"]["brand_name"] == "EcoThread"
    assert create_res.json()["data"]["custom_greeting"] == "Hey there! Welcome to EcoThread support."

    # 2. Get Brand by ID
    get_res = client.get(f"/admin/brands/{brand_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["success"] is True
    assert get_res.json()["data"]["tone"] == "casual"

    # 3. Update Brand
    update_payload = {
        "tone": "formal",
        "custom_greeting": "Welcome to EcoThread Support Department."
    }
    update_res = client.put(f"/admin/brands/{brand_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["success"] is True
    assert update_res.json()["data"]["tone"] == "formal"
    assert update_res.json()["data"]["custom_greeting"] == "Welcome to EcoThread Support Department."

    # 4. List Brands with Pagination
    list_res = client.get("/admin/brands?page=1&limit=1", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1

    # 5. Delete Brand
    del_res = client.delete(f"/admin/brands/{brand_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 6. Verify brand deleted
    get_del_res = client.get(f"/admin/brands/{brand_id}", headers=headers)
    assert get_del_res.status_code == 404
    assert get_del_res.json()["success"] is False

@pytest.mark.anyio
async def test_pagination_endpoints():
    pwd_hash = await get_password_hash("password123")
    MockUserRepository.users["admin_123"]["password_hash"] = pwd_hash
    MockUserRepository.users["customer_123"]["password_hash"] = pwd_hash

    # Login Admin
    login_res = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test Ticket list pagination
    ticket_list_res = client.get("/tickets?page=2&limit=5", headers=headers)
    assert ticket_list_res.status_code == 200
    assert ticket_list_res.json()["success"] is True
    assert len(ticket_list_res.json()["data"]) == 5

    # Test Chat history list pagination
    history_res = client.get("/chat/ticket_1/history?page=2&limit=10", headers=headers)
    assert history_res.status_code == 200

    assert history_res.json()["success"] is True
    assert len(history_res.json()["data"]) == 10

@pytest.mark.anyio
async def test_rate_limiting():
    # Enable limiter specifically for this test
    app.state.limiter.enabled = True
    try:
        # Make multiple fast requests to login endpoint to trigger rate limits
        # The login rate limit is set to 5/minute
        triggered_429 = False
        for i in range(10):
            res = client.post("/auth/login", json={"email": "non_existent@gmail.com", "password": "pass"})
            if res.status_code == 429:
                triggered_429 = True
                envelope = res.json()
                assert envelope["success"] is False
                assert "rate limit exceeded" in envelope["message"].lower()
                break
        
        assert triggered_429 is True, "Rate limit should have triggered 429 status code"
    finally:
        # Disable limiter again for remaining tests
        app.state.limiter.enabled = False


if __name__ == "__main__":
    import pytest
    import sys
    sys.exit(pytest.main(["-v", __file__]))
