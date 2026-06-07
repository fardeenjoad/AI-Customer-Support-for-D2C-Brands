import os
# Configure mock environment variables before imports
os.environ["SUPABASE_URL"] = "https://mock-supabase-url.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-supabase-anon-key-long-enough-to-be-valid-for-testing"
os.environ["GROQ_API_KEY"] = "gsk_mock_api_key_valid_format_dummy"
os.environ["RESEND_API_KEY"] = "re_mock_api_key"
os.environ["JWT_SECRET"] = "mock_secret_key_long_enough_to_be_secure"

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.supabase import SupabaseDB
from test_endpoints import MockSupabaseClient, get_password_hash

client = TestClient(app)

hashed = get_password_hash("password123")

class MockUserRepository:
    users = {
        "agent_123": {
            "id": "agent_123",
            "email": "agent@ecostyle.com",
            "password_hash": hashed,
            "role": "agent",
            "brand_id": None
        },
        "admin_123": {
            "id": "admin_123",
            "email": "admin@ecostyle.com",
            "password_hash": hashed,
            "role": "admin",
            "brand_id": None
        },
        "customer_123": {
            "id": "customer_123",
            "email": "customer@gmail.com",
            "password_hash": hashed,
            "role": "customer",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        }
    }

    async def get_user_by_email(self, email: str):
        for u in self.users.values():
            if u["email"] == email:
                return u
        return None

    async def get_user_by_id(self, user_id: str):
        return self.users.get(user_id)

class MockTicketRepository:
    tickets = {
        "ticket_123": {
            "id": "ticket_123",
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": "EcoStyle Chat Support",
            "status": "open",
            "priority": "low",
            "sentiment": "neutral",
            "assigned_agent_id": None,
            "created_at": "2026-06-06T12:00:00Z",
            "updated_at": "2026-06-06T12:00:00Z"
        }
    }

    async def get_ticket_by_id(self, ticket_id: str):
        return self.tickets.get(ticket_id)

    async def update_ticket(self, ticket_id: str, update_data: dict):
        t = self.tickets.get(ticket_id)
        if t:
            t.update(update_data)
            return t
        return None

class MockMessageRepository:
    messages = []

    async def create_message(self, message_data: dict):
        msg = {
            "id": "msg_new",
            **message_data,
            "timestamp": "2026-06-06T12:00:00Z"
        }
        self.messages.append(msg)
        return msg

@pytest.fixture(autouse=True)
def setup_overrides():
    orig_get_client = SupabaseDB.get_client
    SupabaseDB.get_client = lambda: MockSupabaseClient()
    
    from app.repositories.user_repo import UserRepository
    from app.repositories.ticket_repo import TicketRepository
    from app.repositories.message_repo import MessageRepository

    app.dependency_overrides[UserRepository] = lambda: MockUserRepository()
    app.dependency_overrides[TicketRepository] = lambda: MockTicketRepository()
    app.dependency_overrides[MessageRepository] = lambda: MockMessageRepository()

    yield
    app.dependency_overrides.clear()
    SupabaseDB.get_client = orig_get_client
    MockMessageRepository.messages.clear()

def test_agent_reply_success():
    # 1. Login agent
    login_res = client.post("/auth/login", json={"email": "agent@ecostyle.com", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Post reply
    reply_payload = {"content": "We have shipped your order."}
    response = client.post("/tickets/ticket_123/reply", json=reply_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["sender"] == "agent"
    assert data["content"] == "We have shipped your order."
    assert len(MockMessageRepository.messages) == 1

def test_admin_reply_success():
    # 1. Login admin
    login_res = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Post reply
    reply_payload = {"content": "Admin reply message."}
    response = client.post("/tickets/ticket_123/reply", json=reply_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["sender"] == "agent" # Database marks agent/admin replies as "agent"
    assert data["content"] == "Admin reply message."

def test_customer_reply_forbidden():
    # 1. Login customer
    login_res = client.post("/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Post reply (should fail with 403 Forbidden)
    reply_payload = {"content": "Customer attempting to reply to admin route."}
    response = client.post("/tickets/ticket_123/reply", json=reply_payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["success"] is False
