from __future__ import annotations

from pydantic import BaseModel


class QueryResponse(BaseModel):
    """Response returned by the query endpoint."""

    answer: str
    sources: list[dict]
