import os
# Configure mock environment variables before imports
os.environ["SUPABASE_URL"] = "https://mock-supabase-url.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-supabase-anon-key-long-enough-to-be-valid-for-testing"
os.environ["GROQ_API_KEY"] = "gsk_mock_api_key_valid_format_dummy"
os.environ["RESEND_API_KEY"] = "re_mock_api_key"
os.environ["JWT_SECRET"] = "mock_secret_key_long_enough_to_be_secure"

import pytest
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.supabase import SupabaseDB

# Mock repositories
class MockUserRepository:
    users = {
        "customer_123": {
            "id": "customer_123",
            "email": "customer@gmail.com",
            "role": "customer",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        },
        "hacker_123": {
            "id": "hacker_123",
            "email": "hacker@gmail.com",
            "role": "customer",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        }
    }

    async def get_user_by_email(self, email: str):
        for u in self.users.values():
            if u["email"] == email:
                return u
        return None

    async def create_user(self, user_data: dict):
        user_id = f"user_{len(self.users) + 1}"
        user = {
            "id": user_id,
            **user_data
        }
        self.users[user_id] = user
        return user

class MockTicketRepository:
    tickets = {
        "ticket_123": {
            "id": "ticket_123",
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": "Inquiry #1",
            "status": "open",
            "priority": "low",
            "sentiment": "neutral",
            "created_at": "2026-06-06T12:00:00Z",
            "updated_at": "2026-06-06T12:00:00Z"
        }
    }

    async def get_ticket_by_id(self, ticket_id: str):
        return self.tickets.get(ticket_id)

    async def list_tickets(self, customer_id: str = None, **kwargs):
        results = []
        for t in self.tickets.values():
            if customer_id and t["customer_id"] == customer_id:
                results.append(t)
        return results

    async def create_ticket(self, ticket_data: dict):
        ticket_id = f"ticket_{len(self.tickets) + 1}"
        ticket = {
            "id": ticket_id,
            **ticket_data,
            "created_at": "2026-06-06T12:00:00Z",
            "updated_at": "2026-06-06T12:00:00Z"
        }
        self.tickets[ticket_id] = ticket
        return ticket

    async def update_ticket(self, ticket_id: str, update_data: dict):
        t = self.tickets.get(ticket_id)
        if t:
            t.update(update_data)
            return t
        return None

class MockMessageRepository:
    messages = []
    
    async def list_messages_by_ticket(self, ticket_id: str):
        return [m for m in self.messages if m["ticket_id"] == ticket_id]

    async def create_message(self, message_data: dict):
        msg = {
            "id": f"msg_{len(self.messages) + 1}",
            **message_data,
            "timestamp": "2026-06-06T12:00:00Z"
        }
        self.messages.append(msg)
        return msg

# Mock db table executor
class MockSupabaseTable:
    def select(self, *args, **kwargs): return self
    def eq(self, *args, **kwargs): return self
    def execute(self):
        class Response:
            data = []
        return Response()

class MockSupabaseClient:
    def table(self, table_name):
        return MockSupabaseTable()

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

@pytest.fixture
def anyio_backend():
    return "asyncio"

client = TestClient(app)

# ────────────────────────────────────────────────────────────────
#  API PORTAL TESTS
# ────────────────────────────────────────────────────────────────

def test_portal_lookup_route():
    # 1. Non-existent email should return empty array
    response = client.get("/tickets/portal/lookup?email=missing@gmail.com")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"] == []

    # 2. Existing email should return the ticket card listing
    response = client.get("/tickets/portal/lookup?email=customer@gmail.com")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) == 1
    assert response.json()["data"][0]["id"] == "ticket_123"

def test_portal_get_ticket_details_and_security():
    # 1. Correct email retrieves details
    response = client.get("/tickets/portal/ticket_123?email=customer@gmail.com")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["ticket"]["id"] == "ticket_123"

    # 2. Wrong email should trigger a 403 Forbidden check (security check)
    response = client.get("/tickets/portal/ticket_123?email=hacker@gmail.com")
    assert response.status_code == 403
    assert response.json()["success"] is False
    assert "Access denied" in response.json()["message"]

def test_portal_create_ticket_with_auto_register():
    payload = {
        "email": "new_buyer@gmail.com",
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "subject": "Missing items",
        "initial_message": "My order is missing organic cotton shirts."
    }
    with patch("app.services.email_service.EmailService.send_ticket_created") as mock_email:
        response = client.post("/tickets/portal/create", json=payload)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["subject"] == "Missing items"
        assert data["customer_id"] is not None
        mock_email.assert_called_once()

        # Check user database includes auto-created customer profile
        user_lookup = client.get("/tickets/portal/lookup?email=new_buyer@gmail.com")
        assert len(user_lookup.json()["data"]) == 1

def test_portal_add_reply():
    payload = {
        "email": "customer@gmail.com",
        "content": "Yes, I am still waiting for refund."
    }
    response = client.post("/tickets/portal/ticket_123/reply", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["sender"] == "customer"
    assert response.json()["data"]["content"] == "Yes, I am still waiting for refund."

def test_portal_submit_feedback():
    payload = {
        "email": "customer@gmail.com",
        "rating": 5,
        "comment": "Awesome support response!"
    }
    response = client.post("/tickets/portal/ticket_123/feedback", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["rating"] == 5
    assert response.json()["data"]["feedback_comment"] == "Awesome support response!"

def test_portal_lookup_last_message_sender():
    # 1. Initially last_message_sender should be None
    response = client.get("/tickets/portal/lookup?email=customer@gmail.com")
    assert response.status_code == 200
    assert response.json()["data"][0]["last_message_sender"] is None

    # 2. Add a message from AI
    MockMessageRepository.messages.append({
        "id": "msg_1",
        "ticket_id": "ticket_123",
        "sender": "ai",
        "content": "Hello! I am AI helper.",
        "timestamp": "2026-06-06T12:05:00Z"
    })
    
    response = client.get("/tickets/portal/lookup?email=customer@gmail.com")
    assert response.status_code == 200
    assert response.json()["data"][0]["last_message_sender"] == "ai"

    # 3. Add a later message from customer
    MockMessageRepository.messages.append({
        "id": "msg_2",
        "ticket_id": "ticket_123",
        "sender": "customer",
        "content": "Thanks!",
        "timestamp": "2026-06-06T12:06:00Z"
    })
    
    response = client.get("/tickets/portal/lookup?email=customer@gmail.com")
    assert response.status_code == 200
    assert response.json()["data"][0]["last_message_sender"] == "customer"
