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
from app.repositories.message_repo import MessageRepository
from app.repositories.brand_repo import BrandRepository
from app.core.security import get_password_hash
from app.services.email_service import EmailService
from app.db.supabase import SupabaseDB
from typing import List, Optional
from app.routers.admin import get_email_service as admin_get_email_service
from app.routers.tickets import get_email_service as tickets_get_email_service
from app.routers.chat import get_email_service as chat_get_email_service

# 1. Setup Mock database queries for agent_brands
class MockSupabaseTable:
    def __init__(self, table_name):
        self.table_name = table_name
        self.filters = {}

    def select(self, *args, **kwargs):
        return self

    def eq(self, key, val):
        self.filters[key] = val
        return self

    def execute(self):
        class Response:
            def __init__(self, data):
                self.data = data

        if self.table_name == "agent_brands":
            agent_id = self.filters.get("agent_id")
            brand_id = self.filters.get("brand_id")
            
            # Map agent_123 to EcoStyle brand
            if agent_id == "agent_123":
                if brand_id and brand_id != "f47ac10b-58cc-4372-a567-0e02b2c3d479":
                    return Response([])
                return Response([{"agent_id": "agent_123", "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"}])
            return Response([])
        return Response([])

class MockSupabaseClient:
    def table(self, table_name):
        return MockSupabaseTable(table_name)

# 2. Setup Repository Mocks
class MockUserRepository:
    users = {
        "admin_123": {
            "id": "admin_123",
            "email": "admin@ecostyle.com",
            "role": "admin",
            "brand_id": None,
            "created_at": "2026-06-06T12:00:00Z"
        },
        "agent_123": {
            "id": "agent_123",
            "email": "agent@ecostyle.com",
            "role": "agent",
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

class MockTicketRepository:
    tickets = {}
    
    async def create_ticket(self, ticket_data: dict) -> dict:
        ticket_id = f"ticket_{len(self.tickets) + 1}"
        ticket = {
            "id": ticket_id,
            "customer_id": ticket_data.get("customer_id"),
            "brand_id": ticket_data.get("brand_id"),
            "subject": ticket_data.get("subject"),
            "status": ticket_data.get("status", "open"),
            "priority": ticket_data.get("priority", "low"),
            "sentiment": ticket_data.get("sentiment", "neutral"),
            "assigned_agent_id": ticket_data.get("assigned_agent_id"),
            "rating": ticket_data.get("rating"),
            "feedback_comment": ticket_data.get("feedback_comment"),
            "created_at": ticket_data.get("created_at", datetime.now(timezone.utc)),
            "updated_at": ticket_data.get("updated_at", datetime.now(timezone.utc)),
            "is_deleted": False
        }
        self.tickets[ticket_id] = ticket
        return ticket

    async def get_ticket_by_id(self, ticket_id: str) -> Optional[dict]:
        t = self.tickets.get(ticket_id)
        if t and not t.get("is_deleted", False):
            return t
        return None

    async def list_tickets(self, **kwargs) -> List[dict]:
        brand_id = kwargs.get("brand_id")
        status = kwargs.get("status")
        priority = kwargs.get("priority")
        allowed_brand_ids = kwargs.get("allowed_brand_ids")
        customer_id = kwargs.get("customer_id")

        results = []
        for t in self.tickets.values():
            if t.get("is_deleted", False):
                continue
            if customer_id and t.get("customer_id") != customer_id:
                continue
            if brand_id and t.get("brand_id") != brand_id:
                continue
            if status and t.get("status") != status:
                continue
            if priority and t.get("priority") != priority:
                continue
            if allowed_brand_ids is not None and t.get("brand_id") not in allowed_brand_ids:
                continue
            results.append(t)
        return results

    async def update_ticket(self, ticket_id: str, update_data: dict) -> Optional[dict]:
        t = self.tickets.get(ticket_id)
        if t and not t.get("is_deleted", False):
            t.update(update_data)
            return t
        return None

class MockMessageRepository:
    async def create_message(self, message_data: dict) -> dict:
        return {"id": "msg_mocked"}
    async def list_messages_by_ticket(self, ticket_id: str) -> List[dict]:
        return []

class MockBrandRepository:
    async def get_brand_by_id(self, brand_id: str) -> Optional[dict]:
        if brand_id == "f47ac10b-58cc-4372-a567-0e02b2c3d479":
            return {
                "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                "brand_name": "EcoStyle",
                "tone": "friendly",
                "faqs": [{"question": "What is return policy?", "answer": "30 days."}],
                "email_config": {
                    "ticket_created": {"subject": "Created ticket #{ticket_id}", "body": "Welcome {customer_name}"},
                    "ticket_resolved": {"subject": "Resolved ticket #{ticket_id}", "body": "Closed {customer_name}"},
                    "agent_assigned": {"subject": "Assigned ticket #{ticket_id}", "body": "Assigned"}
                },
                "custom_greeting": "Hello! Welcome to EcoStyle Support."
            }
        return None


# 3. Capture Emails dispatched
class CaptureEmailService(EmailService):
    sent_emails = []
    
    async def _send_resend_email(self, to_email: str, subject: str, html_body: str):
        self.sent_emails.append({
            "to": to_email,
            "subject": subject,
            "body": html_body
        })


# Inject dependency overrides
@pytest.fixture(autouse=True)
def setup_overrides():
    orig_get_client = SupabaseDB.get_client
    SupabaseDB.get_client = lambda: MockSupabaseClient()
    app.dependency_overrides.clear()
    app.dependency_overrides[UserRepository] = lambda: MockUserRepository()
    app.dependency_overrides[TicketRepository] = lambda: MockTicketRepository()
    app.dependency_overrides[MessageRepository] = lambda: MockMessageRepository()
    app.dependency_overrides[BrandRepository] = lambda: MockBrandRepository()

    mock_email_service = CaptureEmailService(MockUserRepository(), MockBrandRepository(), MockTicketRepository())
    app.dependency_overrides[admin_get_email_service] = lambda: mock_email_service
    app.dependency_overrides[tickets_get_email_service] = lambda: mock_email_service
    app.dependency_overrides[chat_get_email_service] = lambda: mock_email_service
    yield
    app.dependency_overrides.clear()
    SupabaseDB.get_client = orig_get_client

@pytest.fixture
def anyio_backend():
    return "asyncio"

client = TestClient(app, raise_server_exceptions=False)
pwd_hash = ""

@pytest.mark.anyio
async def test_phase4_workflow():
    global pwd_hash
    pwd_hash = await get_password_hash("password123")
    
    # Set hashes
    for u in MockUserRepository.users.values():
        u["password_hash"] = pwd_hash

    # Reset repository and email logs
    MockTicketRepository.tickets = {
        "ticket_123": {
            "id": "ticket_123",
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": "EcoStyle Chat Support",
            "status": "open",
            "priority": "low",
            "sentiment": "neutral",
            "assigned_agent_id": None,
            "rating": None,
            "feedback_comment": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "is_deleted": False
        },
        "stale_ticket": {
            "id": "stale_ticket",
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": "Stale Issue",
            "status": "open",
            "priority": "medium",
            "sentiment": "neutral",
            "assigned_agent_id": "agent_123",
            "rating": 4,
            "feedback_comment": "Decent",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=30),
            "updated_at": datetime.now(timezone.utc) - timedelta(hours=30),
            "is_deleted": False
        }
    }
    CaptureEmailService.sent_emails = []

    # 1. Login Accounts
    admin_login = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    agent_login = client.post("/auth/login", json={"email": "agent@ecostyle.com", "password": "password123"})
    agent_token = agent_login.json()["data"]["access_token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    customer_login = client.post("/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
    customer_token = customer_login.json()["data"]["access_token"]
    customer_headers = {"Authorization": f"Bearer {customer_token}"}

    # 2. Test Customer creating ticket -> triggers HTML email
    create_payload = {
        "subject": "My Delivery Question",
        "initial_message": "Where is my item?",
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    }
    create_res = client.post("/tickets", json=create_payload, headers=customer_headers)
    assert create_res.status_code == 201
    created_ticket_id = create_res.json()["data"]["id"]
    
    # Check HTML email was sent
    assert len(CaptureEmailService.sent_emails) == 1
    assert CaptureEmailService.sent_emails[-1]["to"] == "customer@gmail.com"
    assert "Support Ticket Created" in CaptureEmailService.sent_emails[-1]["subject"]
    assert "<!DOCTYPE html>" in CaptureEmailService.sent_emails[-1]["body"]

    # 3. Test Admin tickets listing with pagination
    list_res = client.get("/admin/tickets?page=1&limit=2", headers=admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 2

    # Verify Agent gets 403 Forbidden
    list_res_agent = client.get("/admin/tickets", headers=agent_headers)
    assert list_res_agent.status_code == 403

    # 4. Test Admin assigning ticket (/admin/assign) -> triggers assignment HTML email
    assign_payload = {"ticket_id": created_ticket_id, "agent_id": "agent_123"}
    assign_res = client.post("/admin/assign", json=assign_payload, headers=admin_headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["data"]["assigned_agent_id"] == "agent_123"
    assert assign_res.json()["data"]["status"] == "in_progress"

    # Check agent assigned HTML email was sent
    assert CaptureEmailService.sent_emails[-1]["to"] == "agent@ecostyle.com"
    assert "Support Ticket Assigned" in CaptureEmailService.sent_emails[-1]["subject"]
    assert "View and Manage Ticket" in CaptureEmailService.sent_emails[-1]["body"]

    # 5. Test Agent resolving ticket -> triggers resolved HTML email to customer
    update_res = client.put(f"/tickets/{created_ticket_id}", json={"status": "resolved"}, headers=agent_headers)
    assert update_res.status_code == 200
    
    # Check ticket resolved HTML email was sent
    assert CaptureEmailService.sent_emails[-1]["to"] == "customer@gmail.com"
    assert "Support Ticket Resolved" in CaptureEmailService.sent_emails[-1]["subject"]
    assert "Rate Your Experience" in CaptureEmailService.sent_emails[-1]["body"]

    # 6. Test Admin Analytics Endpoint
    analytics_res = client.get("/admin/analytics", headers=admin_headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()["data"]
    assert analytics_data["total_today"] >= 1
    assert analytics_data["total_week"] >= 1
    assert analytics_data["total_month"] >= 1
    assert analytics_data["avg_resolution_time_hours"] is not None
    assert analytics_data["tickets_by_status"]["resolved"] >= 1
    assert analytics_data["most_common_intents"]["query"] >= 1

    # 7. Test Admin Alerts Endpoint
    alerts_res = client.get("/admin/alerts", headers=admin_headers)
    assert alerts_res.status_code == 200
    alert_list = alerts_res.json()["data"]
    assert len(alert_list) == 1
    assert alert_list[0]["id"] == "stale_ticket"

if __name__ == "__main__":
    import sys
    print("Running Phase 4 validation tests...")
    pytest_args = ["-v", __file__]
    status_code = pytest.main(pytest_args)
    sys.exit(status_code)
