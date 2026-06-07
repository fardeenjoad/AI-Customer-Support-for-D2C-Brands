from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.routers import auth, chat, tickets, admin
from app.models.schemas import ResponseEnvelope
from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import logging
import time

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ResolveIQ")

app = FastAPI(
    title="ResolveIQ Support Platform",
    description="Production-level D2C Customer Support platform backend.",
    version="1.0.0"
)

# SlowAPI Limiter state setup
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(tickets.router)
app.include_router(admin.router)

import os
from fastapi.staticfiles import StaticFiles
os.makedirs(os.path.join("static", "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

from fastapi.exceptions import HTTPException

# Log requests middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        logger.info(
            f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {duration:.4f}s"
        )
        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"Method: {request.method} Path: {request.url.path} Failed: {str(e)} Duration: {duration:.4f}s"
        )
        raise e

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Catches FastAPI HTTPExceptions and maps them to standard JSON envelopes.
    """
    envelope = ResponseEnvelope(
        success=False,
        data=None,
        message=exc.detail
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=envelope.model_dump(),
        headers=exc.headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Catches validation errors and returns consistent JSON ResponseEnvelope.
    """
    envelope = ResponseEnvelope(
        success=False,
        data=None,
        message=f"Validation error: {exc.errors()}"
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=envelope.model_dump()
    )

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Catches rate limit exceeded events and formats consistent JSON ResponseEnvelope.
    """
    envelope = ResponseEnvelope(
        success=False,
        data=None,
        message=f"Rate limit exceeded: {exc.detail}"
    )
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=envelope.model_dump()
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches all unhandled exceptions globally and formats a standardized JSON envelope.
    """
    logger.error(f"Global exception caught: {str(exc)}", exc_info=True)
    envelope = ResponseEnvelope(
        success=False,
        data=None,
        message=f"An unexpected error occurred: {str(exc)}"
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=envelope.model_dump()
    )


@app.get("/health", response_model=ResponseEnvelope[dict])
async def health_check() -> ResponseEnvelope[dict]:
    """
    Health check API verify backend system status.
    Returns standardized response envelope.
    """
    return ResponseEnvelope(
        success=True,
        data={"status": "healthy", "service": "ResolveIQ Core API"},
        message="System is operational."
    )
