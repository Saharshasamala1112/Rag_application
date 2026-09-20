import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.request import QueryRequest
from app.services.query_service import QueryService

router = APIRouter(tags=["Query"])

query_service = QueryService()


@router.post("/query")
def query(request: QueryRequest):
    """Query documents with RAG."""
    document_dirs = query_service.resolve_document_dirs(request.document_id)

    if not document_dirs and request.document_id:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return query_service.query(request)


@router.post("/query/stream")
async def query_stream(request: QueryRequest):
    """Stream RAG response via Server-Sent Events."""

    document_dirs = query_service.resolve_document_dirs(request.document_id)
    if not document_dirs and request.document_id:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    async def event_generator():
        for event in query_service.query_stream(request):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
