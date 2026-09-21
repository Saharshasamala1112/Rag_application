"""Conversation API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.conversation import ConversationCreate, ConversationUpdate
from app.services import conversation_service

router = APIRouter(tags=["Conversations"])


@router.get("/conversations")
def list_conversations() -> dict:
    conversations = conversation_service.list_conversations()
    return {"conversations": conversations, "total": len(conversations)}


@router.post("/conversations")
def create_conversation(body: ConversationCreate | None = None) -> dict:
    title = body.title if body else None
    conv = conversation_service.create_conversation(title=title)
    return conv


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str) -> dict:
    conv = conversation_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv


@router.patch("/conversations/{conversation_id}")
def update_conversation(conversation_id: str, body: ConversationUpdate) -> dict:
    conv = conversation_service.update_conversation_title(conversation_id, body.title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str) -> dict:
    deleted = conversation_service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"message": "Conversation deleted.", "conversation_id": conversation_id}
