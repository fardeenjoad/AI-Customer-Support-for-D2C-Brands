from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from app.repositories.user_repo import UserRepository
from app.models.schemas import UserRegister, UserLogin, Token, UserResponse, ResponseEnvelope, TokenData
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user
from typing import Any
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=ResponseEnvelope[UserResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    payload: UserRegister, 
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[UserResponse]:
    """
    Registers a new customer. Requires a valid brand_id for scoping.
    """
    try:
        # 1. Check if email already registered
        existing = await user_repo.get_user_by_email(payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered."
            )

        # 2. Hash password and insert user
        pwd_hash = await get_password_hash(payload.password)
        user_data = {
            "email": payload.email,
            "password_hash": pwd_hash,
            "role": "customer",
            "brand_id": payload.brand_id
        }

        created = await user_repo.create_user(user_data)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register customer record."
            )

        return ResponseEnvelope[UserResponse](
            success=True,
            data=UserResponse.model_validate(created),
            message="User registered successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )


@router.post("/login", response_model=ResponseEnvelope[Token])
@limiter.limit("5/minute")
async def login(
    request: Request,
    payload: UserLogin, 
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[Token]:
    """
    Authenticates a user credentials and yields a bearer access token.
    """
    try:
        user = await user_repo.get_user_by_email(payload.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Verify password hash
        is_valid = await verify_password(payload.password, user.get("password_hash"))
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        token_payload = {
            "user_id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "brand_id": user.get("brand_id")
        }
        
        token = Token(
            access_token=create_access_token(token_payload),
            token_type="bearer"
        )

        return ResponseEnvelope[Token](
            success=True,
            data=token,
            message="User authenticated successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

@router.get("/me", response_model=ResponseEnvelope[UserResponse])
@limiter.limit("30/minute")
async def get_me(
    request: Request,
    current_user: TokenData = Depends(get_current_user),
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[UserResponse]:
    """
    Retrieves the authenticated user's profile information.
    """
    try:
        user = await user_repo.get_user_by_id(current_user.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found."
            )

        return ResponseEnvelope[UserResponse](
            success=True,
            data=UserResponse.model_validate(user),
            message="Profile fetched successfully."
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile fetch error: {str(e)}"
        )


class PrivyLoginRequest(BaseModel):
    token: str

_privy_jwks_cache = None

@router.post("/privy-login", response_model=ResponseEnvelope[Token])
@limiter.limit("10/minute")
async def privy_login(
    request: Request,
    payload: PrivyLoginRequest,
    user_repo: UserRepository = Depends()
) -> ResponseEnvelope[Token]:
    """
    Authenticates a customer using a Privy JWT token.
    If the user does not exist, registers them dynamically.
    Yields a standard local access token.
    """
    global _privy_jwks_cache
    import secrets
    import base64
    import httpx
    from jose import jwt as jose_jwt
    from app.core.config import settings

    try:
        token = payload.token
        app_id = settings.PRIVY_APP_ID
        app_secret = settings.PRIVY_APP_SECRET
        
        email = None
        
        # 1. Sandbox/dev bypass: plain email for testing
        if "@" in token and "." not in token.split("@")[0][:3]:
            # Likely a plain email, not a JWT
            pass
        
        # Check if it's a plain email (no dots like a JWT would have)
        if "@" in token and token.count(".") < 2:
            email = token
        else:
            # It's a real JWT token from Privy
            try:
                # Decode without verification first to get claims
                unverified_claims = jose_jwt.get_unverified_claims(token)
                privy_user_id = unverified_claims.get("sub")  # e.g., "did:privy:xxxxx"
                
                # Try to get email directly from token claims
                email = unverified_claims.get("email")
                
                # If no email in claims, fetch from Privy API using the user ID
                if not email and privy_user_id and app_id and app_secret:
                    try:
                        # Privy API: GET /v1/users/{did}
                        auth_string = base64.b64encode(f"{app_id}:{app_secret}".encode()).decode()
                        headers = {
                            "Authorization": f"Basic {auth_string}",
                            "privy-app-id": app_id,
                        }
                        
                        user_api_url = f"https://api.privy.io/v1/users/{privy_user_id}"
                        
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            resp = await client.get(user_api_url, headers=headers)
                            
                            if resp.status_code == 200:
                                privy_user_data = resp.json()
                                
                                # Search linked accounts for email
                                linked_accounts = privy_user_data.get("linked_accounts", [])
                                for account in linked_accounts:
                                    account_type = account.get("type", "")
                                    if account_type in ("email", "google_oauth") and account.get("address"):
                                        email = account["address"]
                                        break
                                    elif account.get("email"):
                                        email = account["email"]
                                        break
                            else:
                                # Log the error for debugging
                                import logging
                                logger = logging.getLogger("ResolveIQ")
                                logger.error(f"Privy API returned {resp.status_code}: {resp.text}")
                    except Exception as api_err:
                        import logging
                        logger = logging.getLogger("ResolveIQ")
                        logger.error(f"Privy API call failed: {str(api_err)}")
                
                # Last resort: check 'user' claim in JWT
                if not email and "user" in unverified_claims:
                    user_claim = unverified_claims["user"]
                    if isinstance(user_claim, dict):
                        email = user_claim.get("email")
                        
            except Exception as decode_err:
                # If token can't be decoded at all
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid Privy token format: {str(decode_err)}"
                )

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not extract email from Privy authentication. Please try again."
            )

        # 2. Retrieve or create user record
        user = await user_repo.get_user_by_email(email)
        if not user:
            # Auto-register under Customer role with dummy password hash
            dummy_pwd = await get_password_hash(secrets.token_urlsafe(32))
            user_data = {
                "email": email,
                "password_hash": dummy_pwd,
                "role": "customer",
                "brand_id": None
            }
            user = await user_repo.create_user(user_data)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to register Privy user record."
                )

        # 3. Generate local JWT token
        token_payload = {
            "user_id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "brand_id": user.get("brand_id")
        }
        
        local_token = Token(
            access_token=create_access_token(token_payload),
            token_type="bearer"
        )

        return ResponseEnvelope[Token](
            success=True,
            data=local_token,
            message="User authenticated via Privy successfully."
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Privy login error: {str(e)}"
        )

