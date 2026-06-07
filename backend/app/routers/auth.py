from fastapi import APIRouter, Depends, HTTPException, status, Request
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

