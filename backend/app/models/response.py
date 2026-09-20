from __future__ import annotations

from pydantic import BaseModel


class SourceChunk(BaseModel):
    """A retrieved source chunk."""

    chunk_id: int
    content: str
    source: str
    score: float
    page_number: int | None = None
    header: str | None = None


class QueryResponse(BaseModel):
    """Response returned by the query endpoint."""

    answer: str
    sources: list[SourceChunk]
    retrieval_time_ms: float = 0
    generation_time_ms: float = 0
    total_time_ms: float = 0
