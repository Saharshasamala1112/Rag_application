"""Conversation API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.conversation import (
    Conversation,
    ConversationCreate,
    ConversationDeleteResponse,
    ConversationDetail,
    ConversationListResponse,
    ConversationUpdate,
)
from app.services import conversation_service

router = APIRouter(tags=["Conversations"])


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations() -> ConversationListResponse:
    conversations = conversation_service.list_conversations()
    return ConversationListResponse(
        conversations=[Conversation(**conv) for conv in conversations],
        total=len(conversations),
    )


@router.post("/conversations", response_model=ConversationDetail)
def create_conversation(body: ConversationCreate | None = None) -> ConversationDetail:
    title = body.title if body else None
    conv = conversation_service.create_conversation(title=title)
    return ConversationDetail(**conv)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: str) -> ConversationDetail:
    conv = conversation_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return ConversationDetail(**conv)


@router.patch(
    "/conversations/{conversation_id}", response_model=ConversationDetail
)
def update_conversation(
    conversation_id: str, body: ConversationUpdate
) -> ConversationDetail:
    conv = conversation_service.update_conversation_title(conversation_id, body.title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return ConversationDetail(**conv)


@router.delete(
    "/conversations/{conversation_id}",
    response_model=ConversationDeleteResponse,
)
def delete_conversation(conversation_id: str) -> ConversationDeleteResponse:
    deleted = conversation_service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return ConversationDeleteResponse(
        message="Conversation deleted.", conversation_id=conversation_id
    )
