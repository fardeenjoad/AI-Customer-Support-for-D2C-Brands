from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional, Generic, TypeVar
from datetime import datetime

T = TypeVar("T")

# Standard HTTP Response Envelope
class ResponseEnvelope(BaseModel, Generic[T]):
    """
    Standard envelope format for all API responses in ResolveIQ.
    """
    success: bool
    data: Optional[T] = None
    message: str

# Token & Auth Schemas
class UserRegister(BaseModel):
    """Payload to register a new customer account."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    brand_id: Optional[str] = None  # Scoped brand for customer users

class UserLogin(BaseModel):
    """Payload to authenticate user."""
    email: EmailStr
    password: str

class Token(BaseModel):
    """JWT response token details."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Decoded JWT payload storage."""
    user_id: str
    email: str
    role: str
    brand_id: Optional[str] = None

class UserResponse(BaseModel):
    """Public user response details."""
    id: str
    email: str
    role: str
    brand_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# FAQ Schema
class FAQItem(BaseModel):
    """Structure representing a single Q&A pair."""
    question: str
    answer: str

# Brand Schemas
class BrandCreate(BaseModel):
    """Payload to create a new D2C Brand configuration."""
    brand_name: str
    faqs: List[FAQItem] = []
    tone: str = "professional"
    email_config: Dict[str, Any] = {}
    custom_greeting: str = "Hello! How can I help you today?"

class BrandUpdate(BaseModel):
    """Payload to update an existing D2C Brand configuration."""
    brand_name: Optional[str] = None
    faqs: Optional[List[FAQItem]] = None
    tone: Optional[str] = None
    email_config: Optional[Dict[str, Any]] = None
    custom_greeting: Optional[str] = None

class BrandResponse(BaseModel):
    """Details of a registered D2C Brand."""
    id: str
    brand_name: str
    faqs: List[FAQItem]
    tone: str
    email_config: Dict[str, Any]
    custom_greeting: str

    class Config:
        from_attributes = True

# Ticket Schemas
class TicketCreate(BaseModel):
    """Payload to open a support ticket."""
    subject: str
    initial_message: str
    brand_id: str

class TicketUpdate(BaseModel):
    """Payload for updating ticket state properties."""
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_agent_id: Optional[str] = None

class TicketReply(BaseModel):
    """Payload to send a reply message to a ticket from an agent/admin."""
    content: str


class TicketResponse(BaseModel):
    """Details representing a customer support ticket."""
    id: str
    customer_id: Optional[str] = None
    brand_id: Optional[str] = None
    subject: str
    status: str
    priority: str
    sentiment: str
    assigned_agent_id: Optional[str] = None
    rating: Optional[int] = None
    feedback_comment: Optional[str] = None
    last_message_preview: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Message Schemas
class MessageCreate(BaseModel):
    """Payload to append messages to a ticket."""
    ticket_id: str
    content: str

class MessageResponse(BaseModel):
    """Representation of support messages in a thread."""
    id: str
    ticket_id: str
    sender: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Chat Schemas
class ChatMessageSend(BaseModel):
    """Payload containing chatbot input query details."""
    brand_id: str
    message: str

class ChatMessageResponse(BaseModel):
    """Chatbot reply output detail."""
    reply: str
    ticket_id: str
    status: str
    escalated: bool

# Analytics Schema
class AnalyticsSummary(BaseModel):
    """Support analytics dashboard KPI metrics."""
    brand_name: str
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    avg_rating: Optional[float] = None
    unresolved_over_24h_count: int
    sentiment_breakdown: Dict[str, int]


# Passwordless Customer Portal Schemas
class PortalTicketCreate(BaseModel):
    """Payload to open a ticket from the public portal without logging in."""
    email: EmailStr
    subject: str
    initial_message: str
    brand_id: str


class PortalMessageCreate(BaseModel):
    """Payload for customer replies in the portal."""
    email: EmailStr
    content: str


class PortalFeedbackCreate(BaseModel):
    """Payload for submitting feedback/ratings on a resolved ticket."""
    email: EmailStr
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

