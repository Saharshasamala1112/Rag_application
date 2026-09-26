"""Chunk model produced by the document chunker."""

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
