from __future__ import annotations

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request body for querying documents."""

    question: str = Field(..., min_length=1, max_length=2000)
    document_id: str | None = Field(default=None, description="Specific document to query, or None for all")
    top_k: int = Field(default=5, ge=1, le=20)
    use_reranking: bool = Field(default=True, description="Use cross-encoder reranking")
