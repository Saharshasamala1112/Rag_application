from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.services.query_service import QueryService

router = APIRouter(tags=["Query"])

query_service = QueryService()


@router.post(
    "/query",
    response_model=QueryResponse,
)
def query(
    request: QueryRequest,
) -> QueryResponse:
    document_dir = Path("data/uploads") / request.document_id

    if not document_dir.exists():
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return query_service.query(request)
