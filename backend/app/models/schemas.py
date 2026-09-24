"""Pydantic models (request/response schemas)."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    user: UserOut
    token: str


# ── Conversations ──────────────────────────────────────
class ConversationCreate(BaseModel):
    title: str = "New Chat"


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_shared: Optional[bool] = None


class ConversationOut(BaseModel):
    id: str
    user_id: str
    title: str
    summary: Optional[str] = None
    is_shared: bool
    share_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


# ── Messages ───────────────────────────────────────────
class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: datetime
    feedback: Optional[Literal["like", "dislike"]] = None


# ── Chat ───────────────────────────────────────────────
class ChatRequest(BaseModel):
    conversation_id: str
    message: str = Field(..., min_length=1, max_length=32000)


# ── Feedback ───────────────────────────────────────────
class FeedbackRequest(BaseModel):
    message_id: str
    feedback: Literal["like", "dislike"]


class FeedbackDelete(BaseModel):
    message_id: str


# ── Memories ───────────────────────────────────────────
class MemoryOut(BaseModel):
    id: str
    user_id: str
    memory: str
    category: str
    importance: int
    created_at: datetime
    updated_at: datetime


class MemoryCreate(BaseModel):
    memory: str = Field(..., min_length=2, max_length=1000)
    category: Optional[str] = "general"
    importance: Optional[int] = 5


class MemoryDelete(BaseModel):
    memory_id: Optional[str] = None
    clear_all: Optional[bool] = False


# ── Share ──────────────────────────────────────────────
class SharedConversationOut(BaseModel):
    conversation: dict
    messages: list


class SummarizeResponse(BaseModel):
    summary: str
