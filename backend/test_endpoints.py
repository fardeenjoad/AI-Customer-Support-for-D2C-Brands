import os
# Configure mock environment variables before importing app to prevent initialization errors
os.environ["SUPABASE_URL"] = "https://mock-supabase-url.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-supabase-anon-key-long-enough-to-be-valid-for-testing"
os.environ["GROQ_API_KEY"] = "gsk_mock_api_key_valid_format_dummy"
os.environ["RESEND_API_KEY"] = "re_mock_api_key"
os.environ["JWT_SECRET"] = "mock_secret_key_long_enough_to_be_secure"

import pytest
from app.db import supabase_helper
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# 1. Setup Mock Supabase Client
class MockSupabaseTable:
    def __init__(self, table_name):
        self.table_name = table_name
        self.filters = {}
        self.insert_data = None
        self.update_data = None
        
    def select(self, *args, **kwargs):
        return self
        
    def eq(self, key, val):
        self.filters[key] = val
        return self
        
    def in_(self, key, vals):
        self.filters[key] = vals
        return self
        
    def lt(self, key, val):
        self.filters[f"{key}__lt"] = val
        return self
        
    def order(self, *args, **kwargs):
        return self
        
    def limit(self, *args, **kwargs):
        return self
        
    def insert(self, data):
        self.insert_data = data
        return self
        
    def update(self, data):
        self.update_data = data
        return self
        
    def execute(self):
        class Response:
            def __init__(self, data):
                self.data = data
        
        # Mock brand lookup
        if self.table_name == "brands":
            brand_id_filter = self.filters.get("id")
            if brand_id_filter and brand_id_filter == "00000000-0000-0000-0000-000000000000":
                return Response([])
            return Response([{
                "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                "brand_name": "EcoStyle",
                "tone": "friendly",
                "faqs": [{"question": "What is return policy?", "answer": "30 days return policy."}],
                "email_config": {
                    "ticket_created": {"subject": "Created ticket", "body": "Welcome {customer_name}"},
                    "ticket_resolved": {"subject": "Resolved ticket", "body": "Closed {customer_name}"},
                    "agent_assigned": {"subject": "Assigned ticket", "body": "Assigned"}
                },
                "custom_greeting": "Hello! Welcome to EcoStyle Support."
            }])

            
        # Mock user lookup
        elif self.table_name == "users":
            hashed = get_password_hash("password123")
            email_filter = self.filters.get("email")
            user_id_filter = self.filters.get("id")
            
            # Handle registration check
            if email_filter == "new_user@gmail.com":
                if self.insert_data:
                    return Response([{
                        "id": "new-user-id",
                        "email": self.insert_data["email"],
                        "role": self.insert_data["role"],
                        "brand_id": self.insert_data["brand_id"],
                        "created_at": "2026-06-06T12:00:00Z"
                    }])
                return Response([])
                
            # Mock agent check
            if user_id_filter == "agent_123" or email_filter == "agent@ecostyle.com":
                return Response([{
                    "id": "agent_123",
                    "email": "agent@ecostyle.com",
                    "password_hash": hashed,
                    "role": "agent",
                    "brand_id": None,
                    "created_at": "2026-06-06T12:00:00Z"
                }])

            # Mock admin check
            if user_id_filter == "admin_123" or email_filter == "admin@ecostyle.com":
                return Response([{
                    "id": "admin_123",
                    "email": "admin@ecostyle.com",
                    "password_hash": hashed,
                    "role": "admin",
                    "brand_id": None,
                    "created_at": "2026-06-06T12:00:00Z"
                }])
                
            # Standard login/fetch user (customer)
            return Response([{
                "id": "customer_123",
                "email": "customer@gmail.com",
                "password_hash": hashed,
                "role": "customer",
                "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                "created_at": "2026-06-06T12:00:00Z"
            }])
            
        # Mock tickets lookup
        elif self.table_name == "tickets":
            ticket = {
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
                "created_at": "2026-06-06T12:00:00Z",
                "updated_at": "2026-06-06T12:00:00Z"
            }
            if self.update_data:
                ticket.update(self.update_data)
            return Response([ticket])
            
        # Mock message lookup
        elif self.table_name == "messages":
            if self.insert_data:
                return Response([{
                    "id": "msg_new",
                    "ticket_id": self.insert_data["ticket_id"],
                    "sender": self.insert_data["sender"],
                    "content": self.insert_data["content"],
                    "timestamp": "2026-06-06T12:00:00Z"
                }])
            return Response([
                {"id": "msg1", "ticket_id": "ticket_123", "sender": "customer", "content": "Hi", "timestamp": "2026-06-06T12:00:00Z"},
                {"id": "msg2", "ticket_id": "ticket_123", "sender": "ai", "content": "Hello", "timestamp": "2026-06-06T12:01:00Z"}
            ])
            
        # Mock agent-brand checks
        elif self.table_name == "agent_brands":
            brand_filter = self.filters.get("brand_id")
            if brand_filter and brand_filter != "f47ac10b-58cc-4372-a567-0e02b2c3d479":
                return Response([])
            return Response([{"agent_id": "agent_123", "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"}])
            
        return Response([])

class MockSupabaseClient:
    def table(self, table_name):
        return MockSupabaseTable(table_name)

from app.db.supabase import SupabaseDB
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(autouse=True)
def setup_db_mock_and_clear_overrides():
    orig_get_client = SupabaseDB.get_client
    SupabaseDB.get_client = lambda: MockSupabaseClient()
    app.dependency_overrides.clear()
    
    from app.services.ai_service import AIService
    from app.services.sentiment_service import SentimentService
    
    class MockAIService:
        async def detect_intent(self, message: str) -> str:
            lower_msg = message.lower()
            if "refund" in lower_msg:
                return "refund"
            if "hate" in lower_msg or "terrible" in lower_msg:
                return "complaint"
            return "general"
            
        async def should_escalate(self, message: str, history: list) -> bool:
            lower_msg = message.lower()
            return "refund" in lower_msg or "hate" in lower_msg or "terrible" in lower_msg
            
        async def generate_reply(self, customer_message: str, brand_context: dict, message_history: list = None) -> str:
            return "Mock AI reply"
            
    class MockSentimentService:
        async def analyze_sentiment(self, message: str) -> str:
            lower_msg = message.lower()
            if "hate" in lower_msg or "terrible" in lower_msg:
                return "negative"
            return "neutral"
            
    app.dependency_overrides[AIService] = lambda: MockAIService()
    app.dependency_overrides[SentimentService] = lambda: MockSentimentService()

    
    yield
    app.dependency_overrides.clear()
    SupabaseDB.get_client = orig_get_client


client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "healthy"

def test_user_flow():
    # 1. Login to get JWT
    login_payload = {
        "email": "customer@gmail.com",
        "password": "password123"
    }
    response = client.post("/auth/login", json=login_payload)
    assert response.status_code == 200
    token = response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test get current user info via protected route
    # We can perform a chat query which requires authentication
    chat_payload = {
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "message": "What is the return policy?"
    }
    chat_response = client.post("/chat", json=chat_payload, headers=headers)
    assert chat_response.status_code == 200
    chat_data = chat_response.json()["data"]
    assert "reply" in chat_data
    assert chat_data["ticket_id"] == "ticket_123"

def test_angry_sentiment_escalation():
    # Login customer
    login_res = client.post("/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
    headers = {"Authorization": f"Bearer {login_res.json()['data']['access_token']}"}

    # Send angry message to trigger automatic escalation
    angry_payload = {
        "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "message": "This is terrible! I hate your customer support and want a refund immediately!"
    }
    response = client.post("/chat", json=angry_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["escalated"] is True
    assert "escalated" in response.json()["message"].lower()

def test_admin_analytics():
    # Login as admin
    admin_login = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    headers = {"Authorization": f"Bearer {admin_login.json()['data']['access_token']}"}

    response = client.get("/admin/analytics?brand_id=f47ac10b-58cc-4372-a567-0e02b2c3d479", headers=headers)
    assert response.status_code == 200
    analytics = response.json()["data"]
    assert analytics["brand_name"] == "EcoStyle"
    assert analytics["total_tickets"] >= 0

def test_agent_brands_access():
    # 1. Login as admin
    admin_login = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['data']['access_token']}"}
    
    # Check that admin can list brands
    res = client.get("/admin/brands", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) > 0

    # 2. Login as agent
    agent_login = client.post("/auth/login", json={"email": "agent@ecostyle.com", "password": "password123"})
    agent_headers = {"Authorization": f"Bearer {agent_login.json()['data']['access_token']}"}

    # Check that agent can list brands (should succeed now instead of 403)
    res = client.get("/admin/brands", headers=agent_headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) > 0
    assert res.json()["data"][0]["brand_name"] == "EcoStyle"

    # Check that agent can get single brand configuration by ID (public endpoint now)
    res = client.get("/admin/brands/f47ac10b-58cc-4372-a567-0e02b2c3d479", headers=agent_headers)
    assert res.status_code == 200
    assert res.json()["data"]["brand_name"] == "EcoStyle"

    # Check that anonymous user can also get single brand configuration by ID (public access for portal/widget)
    res = client.get("/admin/brands/f47ac10b-58cc-4372-a567-0e02b2c3d479")
    assert res.status_code == 200
    assert res.json()["data"]["brand_name"] == "EcoStyle"

    # Check that non-existent brand ID returns 404 Not Found
    res = client.get("/admin/brands/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404

    # 3. Login as customer
    customer_login = client.post("/auth/login", json={"email": "customer@gmail.com", "password": "password123"})
    customer_headers = {"Authorization": f"Bearer {customer_login.json()['data']['access_token']}"}

    # Check that customer can access brands list (public access)
    res = client.get("/admin/brands", headers=customer_headers)
    assert res.status_code == 200
    
    # Check that anonymous user can also access brands list (public access for registration)
    res = client.get("/admin/brands")
    assert res.status_code == 200

if __name__ == "__main__":
    import sys
    print("Running API tests locally with mocked database...")
    pytest_args = ["-v", __file__]
    status_code = pytest.main(pytest_args)
    sys.exit(status_code)
