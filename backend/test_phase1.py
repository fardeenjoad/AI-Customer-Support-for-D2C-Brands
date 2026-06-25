import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.main import app

@pytest.fixture
def anyio_backend():
    return "asyncio"

# Initialize test client with exception raising disabled to verify exception handler
client = TestClient(app, raise_server_exceptions=False)

def test_settings_load():
    """Verify settings loaded configuration from environment."""
    assert settings.SUPABASE_URL is not None
    assert settings.SUPABASE_KEY is not None
    assert settings.JWT_SECRET in ["your_jwt_secret_key_change_me_in_production", "mock_secret_key_long_enough_to_be_secure"] or len(settings.JWT_SECRET) >= 32


@pytest.mark.anyio
async def test_password_hashing():
    """Verify async password hash generation and verification."""
    password = "MySuperSecretPassword123"
    hashed = await get_password_hash(password)
    assert hashed != password
    assert await verify_password(password, hashed) is True
    assert await verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    """Verify JWT token creation, signature verification, and payload extraction."""
    payload = {
        "user_id": "test_uuid_12345",
        "email": "user@example.com",
        "role": "admin",
        "brand_id": None
    }
    token = create_access_token(payload)
    assert token is not None
    
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["user_id"] == payload["user_id"]
    assert decoded["email"] == payload["email"]
    assert decoded["role"] == payload["role"]

def test_health_check_envelope():
    """Verify GET /health returns standard JSON envelope."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "healthy"
    assert "System is operational" in body["message"]

def test_global_exception_handler():
    """Verify unhandled exceptions trigger standardized 500 error envelope."""
    # We will trigger the global exception handler by executing a mock router endpoint if we define one
    # Or we can temporarily add a route that throws an exception to test the handler
    @app.get("/test-error-trigger")
    def trigger_error():
        raise ValueError("Triggered mock value error")
        
    response = client.get("/test-error-trigger")
    assert response.status_code == 500
    body = response.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["message"] == "Internal server error."

if __name__ == "__main__":
    import sys
    print("Running Phase 1 validation tests...")
    pytest_args = ["-v", __file__]
    status_code = pytest.main(pytest_args)
    sys.exit(status_code)
