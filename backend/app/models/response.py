from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.document import DocumentChunk


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


class HealthLiveResponse(BaseModel):
    """Liveness probe response."""

    status: str = "alive"


class RootResponse(BaseModel):
    """Service identity returned by the API root."""

    name: str
    version: str
    docs: str | None = None


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


class UploadResponse(BaseModel):
    """Response returned by the document upload endpoints."""

    message: str
    document_id: str
    filename: str
    chunk_count: int


class DocumentStatusResponse(BaseModel):
    """Processing status of a single document."""

    document_id: str
    status: Literal["uploading", "processing", "ready", "failed"]
    chunk_count: int = 0
    filename: str = "unknown"
    error: str | None = None


class DocumentDeleteResponse(BaseModel):
    """Response returned when a document is deleted."""

    message: str
    document_id: str


class DocumentPreviewResponse(BaseModel):
    """Text preview of a document."""

    document_id: str
    preview: str


class DocumentChunksResponse(BaseModel):
    """All chunks stored for a document."""

    document_id: str
    chunks: list[DocumentChunk]
    total: int
