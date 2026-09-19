from __future__ import annotations

from pydantic import BaseModel


class DocumentChunk(BaseModel):
    """One chunk of a document with metadata."""

    chunk_id: int
    document_id: str
    source: str
    chunk_length: int
    content: str
    page_number: int | None = None
    header: str | None = None
    start_pos: int = 0
    end_pos: int = 0


class DocumentInfo(BaseModel):
    """Stored document metadata."""

    document_id: str
    filename: str
    chunk_count: int
    total_chars: int
    file_size: int
    uploaded_at: str
