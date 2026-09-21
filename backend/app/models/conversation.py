"""Pydantic models for conversations."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    sources: list[dict] | None = None
    created_at: str


class Conversation(BaseModel):
    conversation_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class ConversationDetail(BaseModel):
    conversation_id: str
    title: str
    messages: list[ConversationMessage]
    created_at: str
    updated_at: str


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
