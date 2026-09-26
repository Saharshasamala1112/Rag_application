"""Pydantic models for document collections."""

from __future__ import annotations

from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    document_ids: list[str] = []


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    document_ids: list[str] | None = None


class CollectionResponse(BaseModel):
    collection_id: str
    name: str
    description: str
    document_ids: list[str]
    created_at: str
    updated_at: str


class CollectionListResponse(BaseModel):
    collections: list[CollectionResponse]
    total: int


class CollectionDeleteResponse(BaseModel):
    message: str
    collection_id: str
