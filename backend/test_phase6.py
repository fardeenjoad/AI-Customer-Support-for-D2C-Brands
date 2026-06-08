import os
# Mock configurations
os.environ["SUPABASE_URL"] = "https://mock-supabase-url.supabase.co"
os.environ["SUPABASE_KEY"] = "mock-supabase-anon-key-long-enough-to-be-valid-for-testing"
os.environ["GROQ_API_KEY"] = "gsk_mock_api_key_valid_format_dummy"
os.environ["RESEND_API_KEY"] = "re_mock_api_key"
os.environ["JWT_SECRET"] = "mock_secret_key_long_enough_to_be_secure"

# AWS settings for testing
os.environ["AWS_ACCESS_KEY_ID"] = "mock-aws-access-key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "mock-aws-secret-key"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["AWS_SES_SENDER_EMAIL"] = "support@yourdomain.com"
os.environ["AWS_BEDROCK_MODEL_ID"] = "meta.llama3-70b-instruct-v1:0"
os.environ["AWS_S3_BUCKET_NAME"] = "resolveiq-attachments"

import pytest
import io
import json
from urllib.parse import unquote, urlparse
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.services.s3_service import S3Service
from app.services.email_service import EmailService
from app.services.ai_service import AIService
from app.services.sentiment_service import SentimentService
from app.repositories.user_repo import UserRepository
from app.repositories.ticket_repo import TicketRepository
from app.repositories.message_repo import MessageRepository
from app.core.security import get_password_hash

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

# Mock repositories
class MockUserRepository:
    async def get_user_by_email(self, email: str):
        return {"id": "admin_123", "email": "admin@ecostyle.com", "role": "admin", "brand_id": None}
    async def get_user_by_id(self, user_id: str):
        return {"id": "admin_123", "email": "admin@ecostyle.com", "role": "admin", "brand_id": None}

class MockTicketRepository:
    async def get_ticket_by_id(self, ticket_id: str):
        if ticket_id == "invalid_id":
            return None
        return {
            "id": ticket_id,
            "customer_id": "customer_123",
            "brand_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "subject": "Attachment test ticket",
            "status": "open",
            "priority": "low"
        }

class MockMessageRepository:
    created_messages = []
    async def create_message(self, data: dict):
        self.created_messages.append(data)
        return {"id": "msg_new", **data}

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides.clear()
    app.dependency_overrides[UserRepository] = lambda: MockUserRepository()
    app.dependency_overrides[TicketRepository] = lambda: MockTicketRepository()
    app.dependency_overrides[MessageRepository] = lambda: MockMessageRepository()
    yield
    app.dependency_overrides.clear()
    MockMessageRepository.created_messages.clear()

@pytest.fixture
def anyio_backend():
    return "asyncio"

client = TestClient(app)

# ==================== UNIT & INTEGRATION TESTS ====================

@pytest.mark.anyio
async def test_s3_service_fallback():
    """Verify S3 service falls back to local storage when bucket name is placeholder."""
    # Temporarily set bucket name to placeholder
    orig_bucket = settings.AWS_S3_BUCKET_NAME
    settings.AWS_S3_BUCKET_NAME = "resolveiq-attachments" # matches placeholder
    
    s3_service = S3Service()
    assert s3_service.client_active is False

    # Perform upload
    file_bytes = b"hello world"
    url = await s3_service.upload_file(file_bytes, "test.txt", "text/plain")
    
    # URL should be a local file path
    assert url.startswith("http://localhost:8000/static/uploads/")
    assert url.endswith("-test.txt")

    uploaded_name = os.path.basename(unquote(urlparse(url).path))
    uploaded_path = os.path.join("static", "uploads", uploaded_name)
    if os.path.exists(uploaded_path):
        os.remove(uploaded_path)
    
    # Restore
    settings.AWS_S3_BUCKET_NAME = orig_bucket

@pytest.mark.anyio
@patch("boto3.client")
async def test_s3_service_upload(mock_boto):
    """Verify S3 service uploads to S3 bucket when active."""
    # Create mock s3 client
    mock_s3 = MagicMock()
    mock_boto.return_value = mock_s3
    
    # Set config to custom bucket
    orig_bucket = settings.AWS_S3_BUCKET_NAME
    settings.AWS_S3_BUCKET_NAME = "my-actual-aws-bucket"
    
    s3_service = S3Service()
    assert s3_service.client_active is True
    
    file_bytes = b"hello s3"
    url = await s3_service.upload_file(file_bytes, "hello.txt", "text/plain")
    
    assert url.startswith("https://my-actual-aws-bucket.s3.us-east-1.amazonaws.com/")
    assert url.endswith("-hello.txt")
    mock_s3.put_object.assert_called_once()
    
    settings.AWS_S3_BUCKET_NAME = orig_bucket

@pytest.mark.anyio
@patch("boto3.client")
async def test_email_service_ses(mock_boto):
    """Verify EmailService dispatches via AWS SES when active."""
    mock_ses = MagicMock()
    mock_boto.return_value = mock_ses
    
    orig_email = settings.AWS_SES_SENDER_EMAIL
    settings.AWS_SES_SENDER_EMAIL = "verified@brand.com" # custom email
    
    email_service = EmailService(user_repo=MockUserRepository(), brand_repo=MagicMock())
    assert email_service.ses_active is True
    
    await email_service._send_resend_email("customer@gmail.com", "Test Subject", "Test HTML body")
    mock_ses.send_email.assert_called_once()
    
    settings.AWS_SES_SENDER_EMAIL = orig_email

@pytest.mark.anyio
@patch("boto3.client")
async def test_ai_service_bedrock_reply(mock_boto):
    """Verify AIService generate_reply delegates to Bedrock when active."""
    mock_bedrock = MagicMock()
    # Mock invoke_model response body structure
    mock_read = MagicMock()
    mock_read.read.return_value = json.dumps({"generation": "Answer from Bedrock"}).encode("utf-8")
    mock_bedrock.invoke_model.return_value = {"body": mock_read}
    mock_boto.return_value = mock_bedrock
    
    ai_service = AIService()
    assert ai_service.bedrock_active is True
    
    brand_context = {
        "brand_name": "EcoStyle",
        "tone": "casual",
        "faqs": [],
        "custom_greeting": "Hey!"
    }
    
    reply = await ai_service.generate_reply("Hi support", brand_context)
    assert reply == "Answer from Bedrock"
    mock_bedrock.invoke_model.assert_called_once()

@pytest.mark.anyio
@patch("boto3.client")
async def test_sentiment_service_bedrock(mock_boto):
    """Verify SentimentService analyze_sentiment delegates to Bedrock."""
    mock_bedrock = MagicMock()
    mock_read = MagicMock()
    mock_read.read.return_value = json.dumps({"generation": "negative"}).encode("utf-8")
    mock_bedrock.invoke_model.return_value = {"body": mock_read}
    mock_boto.return_value = mock_bedrock
    
    sentiment_service = SentimentService()
    assert sentiment_service.bedrock_active is True
    
    sentiment = await sentiment_service.analyze_sentiment("This product is terrible")
    assert sentiment == "negative"
    mock_bedrock.invoke_model.assert_called_once()

@pytest.mark.anyio
async def test_attachment_upload_api():
    """Verify FastAPI attachment upload endpoint mounts, uploads file, and writes log message."""
    # Obtain JWT
    pwd_hash = await get_password_hash("password123")
    # Mock login
    with patch.object(MockUserRepository, "get_user_by_email", return_value={
        "id": "admin_123",
        "email": "admin@ecostyle.com",
        "role": "admin",
        "password_hash": pwd_hash,
        "brand_id": None
    }):
        login_res = client.post("/auth/login", json={"email": "admin@ecostyle.com", "password": "password123"})
        assert login_res.status_code == 200
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

    # Upload attachment file
    file_content = b"my uploaded file content"
    files = {"file": ("attachment.png", file_content, "image/png")}
    
    # We patch upload_file on S3Service to return a predictable URL
    with patch.object(S3Service, "upload_file", return_value="http://localhost:8000/static/uploads/attachment.png") as mock_upload:
        res = client.post("/tickets/ticket_123/attachments", files=files, headers=headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["filename"] == "attachment.png"
        assert data["url"] == "http://localhost:8000/static/uploads/attachment.png"
        mock_upload.assert_called_once()
        
        # Verify a log message was added to the database
        assert len(MockMessageRepository.created_messages) == 1
        msg = MockMessageRepository.created_messages[0]
        assert msg["ticket_id"] == "ticket_123"
        assert msg["sender"] == "agent"
        assert "[Attachment: attachment.png" in msg["content"]
