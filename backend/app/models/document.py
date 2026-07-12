from __future__ import annotations

from pydantic import BaseModel


class DocumentChunk(BaseModel):
    """Represents one chunk of a document."""

    chunk_id: int
    document_id: str
    source: str
    chunk_length: int
    content: str
