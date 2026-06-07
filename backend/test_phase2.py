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
from app.core.security import get_password_hash
from typing import List, Optional

# 1. Setup Mock Repositories
class MockUserRepository:
    users = {}
        
    async def create_user(self, user_data: dict) -> dict:
        user_id = "customer_123"
        user = {
            "id": user_id,
            "email": user_data["email"],
            "password_hash": user_data["password_hash"],
            "role": user_data["role"],
            "brand_id": user_data["brand_id"],
            "created_at": "2026-06-06T12:00:00Z"
        }
        self.users[user_id] = user
        return user
        
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        if email == "new_user@gmail.com":
            return None # Simulate not registered
            
        hashed = pwd_hash # defined globally
        role = "customer"
        brand_id = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        
        if email == "admin@ecostyle.com":
            role = "admin"
            brand_id = None
        elif email == "agent@ecostyle.com":
            role = "agent"
            brand_id = None
            
        return {
            "id": f"{role}_123",
            "email": email,
            "password_hash": hashed,
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
    tickets = {
        "ticket_123": {
            "id": "ticket_123",
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": "Mock Ticket",
            "status": "open",
            "priority": "low",
            "sentiment": "neutral",
            "assigned_agent_id": None,
            "rating": None,
            "feedback_comment": None,
            "created_at": "2026-06-06T12:00:00Z",
            "updated_at": "2026-06-06T12:00:00Z",
            "is_deleted": False
        }
    }
        
    async def create_ticket(self, ticket_data: dict) -> dict:
        ticket = {
            "id": "ticket_new",
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
        ticket = self.tickets.get(ticket_id)
        if ticket and not ticket.get("is_deleted", False):
            return ticket
        return None
        
    async def list_tickets(self, **kwargs) -> List[dict]:
        customer_id = kwargs.get("customer_id")
        return [
            t for t in self.tickets.values() 
            if not t.get("is_deleted", False) and (customer_id is None or t.get("customer_id") == customer_id)
        ]
        
    async def update_ticket(self, ticket_id: str, update_data: dict) -> Optional[dict]:
        ticket = self.tickets.get(ticket_id)
        if ticket and not ticket.get("is_deleted", False):
            ticket.update(update_data)
            return ticket
        return None
        
    async def soft_delete_ticket(self, ticket_id: str) -> bool:
        ticket = self.tickets.get(ticket_id)
        if ticket:
            ticket["is_deleted"] = True
            return True
        return False

class MockMessageRepository:
    async def create_message(self, message_data: dict) -> dict:
        return {
            "id": "msg_new",
            "ticket_id": message_data["ticket_id"],
            "sender": message_data["sender"],
            "content": message_data["content"],
            "timestamp": "2026-06-06T12:00:00Z"
        }
        
    async def list_messages_by_ticket(self, ticket_id: str) -> List[dict]:
        return [
            {
                "id": "msg_1",
                "ticket_id": ticket_id,
                "sender": "customer",
                "content": "Hi",
                "timestamp": "2026-06-06T12:00:00Z"
            }
        ]

from app.routers.tickets import get_email_service as tickets_get_email_service

class MockEmailService:
    async def send_ticket_created(self, *args, **kwargs): pass
    async def send_ticket_resolved(self, *args, **kwargs): pass
    async def send_agent_assigned(self, *args, **kwargs): pass
    async def send_stale_ticket_alert(self, *args, **kwargs): pass

# Inject dependency overrides
@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides.clear()
    app.dependency_overrides[UserRepository] = lambda: MockUserRepository()
    app.dependency_overrides[TicketRepository] = lambda: MockTicketRepository()
    app.dependency_overrides[MessageRepository] = lambda: MockMessageRepository()
    app.dependency_overrides[tickets_get_email_service] = lambda: MockEmailService()
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def anyio_backend():
    return "asyncio"

client = TestClient(app, raise_server_exceptions=False)
pwd_hash = ""

@pytest.mark.anyio
async def test_auth_and_tickets_flow():
    global pwd_hash
    pwd_hash = await get_password_hash("password123")
    
    # 1. Register customer
    reg_payload = {
        "email": "new_user@gmail.com",
        "password": "password123",
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    }
    reg_res = client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    assert reg_res.json()["success"] is True
    
    # 2. Login customer
    login_res = client.post("/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. GET /auth/me profile details
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == "customer@gmail.com"
    
    # 4. Create support ticket
    ticket_payload = {
        "subject": "Missing order details",
        "initial_message": "Hello, my order did not arrive yet.",
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    }
    ticket_res = client.post("/tickets", json=ticket_payload, headers=headers)
    assert ticket_res.status_code == 201
    assert ticket_res.json()["success"] is True
    assert ticket_res.json()["data"]["subject"] == "Missing order details"
    
    # 5. List tickets (scoped to customer)
    list_res = client.get("/tickets", headers=headers)
    assert list_res.status_code == 200
    tickets_list = list_res.json()["data"]
    assert len(tickets_list) >= 1
    
    # 6. Fetch ticket details + messages
    details_res = client.get("/tickets/ticket_123", headers=headers)
    assert details_res.status_code == 200
    details = details_res.json()["data"]
    assert details["ticket"]["id"] == "ticket_123"
    assert len(details["messages"]) == 1
    
    # 7. Authenticate as Admin to verify updates and soft delete
    admin_login = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['data']['access_token']}"}
    
    # Update status to in_progress
    update_res = client.put("/tickets/ticket_123", json={"status": "in_progress"}, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["data"]["status"] == "in_progress"
    
    # Soft delete ticket
    del_res = client.delete("/tickets/ticket_123", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
    
    # Try fetching deleted ticket -> should return 404
    fetch_del = client.get("/tickets/ticket_123", headers=admin_headers)
    assert fetch_del.status_code == 404
    assert fetch_del.json()["success"] is False

if __name__ == "__main__":
    import sys
    print("Running Phase 2 validation tests...")
    pytest_args = ["-v", __file__]
    status_code = pytest.main(pytest_args)
    sys.exit(status_code)
