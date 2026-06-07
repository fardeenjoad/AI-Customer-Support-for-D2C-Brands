import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from typing import Optional
from anyio.to_thread import run_sync
from app.core.config import settings

async def get_password_hash(password: str) -> str:
    """
    Asynchronously hashes a password in a worker thread to prevent event loop blocking.
    """
    def _hash():
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")
    return await run_sync(_hash)

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Asynchronously verifies a password against a hash in a worker thread.
    """
    def _verify():
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False
    return await run_sync(_verify)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a JWT access token containing standard claim payloads.
    """
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates the claims of a JWT token.
    Returns the parsed payload dictionary, or None if validation fails.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
