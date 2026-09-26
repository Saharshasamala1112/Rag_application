from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SourceChunk(BaseModel):
    """A retrieved source chunk."""

    chunk_id: int
    content: str
    source: str
    score: float = Field(ge=0.0, le=1.0)
    page_number: int | None = None
    header: str | None = None


class QueryResponse(BaseModel):
    """Response returned by the query endpoint."""

    answer: str
    sources: list[SourceChunk]
    retrieval_time_ms: float = 0
    generation_time_ms: float = 0
    total_time_ms: float = 0


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str
    model: str
    embedding_model: str
    ollama_available: bool
    document_count: int = 0


class SupportedFileType(BaseModel):
    extension: str
    description: str


class SupportedTypesResponse(BaseModel):
    types: list[SupportedFileType]
    total: int


class DocumentInfo(BaseModel):
    """Document metadata."""

    document_id: str
    filename: str
    file_type: str = ""
    chunk_count: int = 0
    total_chars: int = 0
    file_size: int = 0
    uploaded_at: str = ""
    status: Literal["uploading", "processing", "ready", "failed"] = "ready"
    error: str | None = None


class DocumentListResponse(BaseModel):
    """Response for listing documents."""

    documents: list[DocumentInfo]
    total: int
