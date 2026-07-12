from __future__ import annotations

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request body for querying a document."""

    document_id: str
    question: str
    top_k: int = Field(default=5, ge=1, le=20)
