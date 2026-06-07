from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.models.schemas import TokenData
from typing import List

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Dependency to validate the JWT bearer token and extract claims payload.
    Raises 401 Unauthorized if invalid.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("user_id")
    email: str = payload.get("email")
    role: str = payload.get("role")
    brand_id: str = payload.get("brand_id")
    
    if user_id is None or email is None or role is None:
        raise credentials_exception
        
    return TokenData(user_id=user_id, email=email, role=role, brand_id=brand_id)

class RoleChecker:
    """
    Route dependency checking if the authenticated user possesses an allowed role.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: TokenData = Depends(get_current_user)) -> TokenData:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{user.role}' is not authorized to access this resource"
            )
        return user

# Helper instances for DI injection
require_admin = RoleChecker(["admin"])
require_agent = RoleChecker(["agent"])
require_customer = RoleChecker(["customer"])
require_admin_or_agent = RoleChecker(["admin", "agent"])
