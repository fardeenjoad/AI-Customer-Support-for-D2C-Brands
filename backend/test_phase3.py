import os
# Configure mock environment variables before importing app
os.environ["SUPABASE_URL"] = "https://mock-supabase-url.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-supabase-anon-key-long-enough-to-be-valid-for-testing"
os.environ["GROQ_API_KEY"] = "gsk_mock_api_key_valid_format_dummy"
os.environ["RESEND_API_KEY"] = "re_mock_api_key"
os.environ["JWT_SECRET"] = "mock_secret_key_long_enough_to_be_secure"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.repositories.user_repo import UserRepository
from app.repositories.ticket_repo import TicketRepository
from app.repositories.message_repo import MessageRepository
from app.repositories.brand_repo import BrandRepository
from app.core.security import get_password_hash
from typing import List, Optional

# 1. Setup Mock Repositories
class MockUserRepository:
    users = {}
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        role = "customer"
        brand_id = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        return {
            "id": f"{role}_123",
            "email": email,
            "password_hash": pwd_hash,
            "role": role,
            "brand_id": brand_id,
            "created_at": "2026-06-06T12:00:00Z"
        }

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        role = user_id.split("_")[0]
        brand_id = "f47ac10b-58cc-4372-a567-0e02b2c3d479" if role == "customer" else None
        return {
            "id": user_id,
            "email": f"{role}@ecostyle.com" if role != "customer" else "customer@gmail.com",
            "role": role,
            "brand_id": brand_id,
            "created_at": "2026-06-06T12:00:00Z"
        }

class MockTicketRepository:
    tickets = {}
    async def create_ticket(self, ticket_data: dict) -> dict:
        ticket = {
            "id": "ticket_chat_session",
            "customer_id": ticket_data["customer_id"],
            "brand_id": ticket_data["brand_id"],
            "subject": ticket_data["subject"],
            "status": ticket_data["status"],
            "priority": ticket_data["priority"],
            "sentiment": ticket_data["sentiment"],
            "assigned_agent_id": None,
            "rating": None,
            "feedback_comment": None,
            "created_at": "2026-06-06T12:00:00Z",
            "updated_at": "2026-06-06T12:00:00Z",
            "is_deleted": False
        }
        self.tickets[ticket["id"]] = ticket
        return ticket
        
    async def get_ticket_by_id(self, ticket_id: str) -> Optional[dict]:
        return self.tickets.get(ticket_id)
        
    async def list_tickets(self, **kwargs) -> List[dict]:
        return list(self.tickets.values())
        
    async def update_ticket(self, ticket_id: str, update_data: dict) -> Optional[dict]:
        ticket = self.tickets.get(ticket_id)
        if ticket:
            ticket.update(update_data)
            return ticket
        return None

class MockMessageRepository:
    messages = []
    async def create_message(self, message_data: dict) -> dict:
        msg = {
            "id": f"msg_{len(self.messages) + 1}",
            "ticket_id": message_data["ticket_id"],
            "sender": message_data["sender"],
            "content": message_data["content"],
            "timestamp": "2026-06-06T12:00:00Z"
        }
        self.messages.append(msg)
        return msg
        
    async def list_messages_by_ticket(self, ticket_id: str) -> List[dict]:
        return [m for m in self.messages if m["ticket_id"] == ticket_id]

class MockBrandRepository:
    async def get_brand_by_id(self, brand_id: str) -> Optional[dict]:
        return {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "brand_name": "EcoStyle",
            "tone": "friendly",
            "faqs": [{"question": "What is return policy?", "answer": "30 days return policy."}],
            "email_config": {},
            "custom_greeting": "Hello! Welcome to EcoStyle Support."
        }


from app.routers.chat import get_email_service as chat_get_email_service

class MockEmailService:
    async def send_ticket_created(self, *args, **kwargs): pass
    async def send_ticket_resolved(self, *args, **kwargs): pass
    async def send_agent_assigned(self, *args, **kwargs): pass
    async def send_stale_ticket_alert(self, *args, **kwargs): pass

# Override FastAPI dependency maps
@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides.clear()
    app.dependency_overrides[UserRepository] = lambda: MockUserRepository()
    app.dependency_overrides[TicketRepository] = lambda: MockTicketRepository()
    app.dependency_overrides[MessageRepository] = lambda: MockMessageRepository()
    app.dependency_overrides[BrandRepository] = lambda: MockBrandRepository()
    app.dependency_overrides[chat_get_email_service] = lambda: MockEmailService()
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def anyio_backend():
    return "asyncio"

client = TestClient(app, raise_server_exceptions=False)
pwd_hash = ""

@pytest.mark.anyio
async def test_chatbot_sentiment_flow():
    global pwd_hash
    pwd_hash = await get_password_hash("password123")
    
    # 1. Login Customer
    login_res = client.post("/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Clear message history
    MockMessageRepository.messages = []
    MockTicketRepository.tickets = {}

    # 2. Query chatbot with friendly general message
    chat_payload = {
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "message": "Hi, what is EcoStyle?"
    }
    chat_res = client.post("/chat", json=chat_payload, headers=headers)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()["data"]
    assert chat_data["ticket_id"] == "ticket_chat_session"
    assert chat_data["escalated"] is False
    assert len(MockMessageRepository.messages) == 2 # 1 customer + 1 AI reply

    # 3. Query chatbot with angry refund message (should trigger auto-escalate)
    angry_payload = {
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "message": "I hate your services. Refund my money now!"
    }
    angry_res = client.post("/chat", json=angry_payload, headers=headers)
    assert angry_res.status_code == 200
    angry_data = angry_res.json()["data"]
    assert angry_data["escalated"] is True
    assert "escalated" in angry_res.json()["message"].lower()

    # 4. Check conversation history
    history_res = client.get("/chat/ticket_chat_session/history", headers=headers)
    assert history_res.status_code == 200
    history_list = history_res.json()["data"]
    assert len(history_list) == 4 # 2 from query 1 + 2 from query 2
    assert history_list[0]["content"] == "Hi, what is EcoStyle?"

if __name__ == "__main__":
    import sys
    print("Running Phase 3 validation tests...")
    pytest_args = ["-v", __file__]
    status_code = pytest.main(pytest_args)
    sys.exit(status_code)
