import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool

from app.models.request import QueryRequest
from app.services import conversation_service
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

    # Save user message to conversation
    if request.conversation_id:
        conversation_service.add_message(
            request.conversation_id, "user", request.question
        )

    result = query_service.query(request)

    # Save assistant response to conversation
    if request.conversation_id:
        conversation_service.add_message(
            request.conversation_id,
            "assistant",
            result.answer,
            sources=[s.model_dump() for s in result.sources],
        )

    return result


@router.post("/query/stream")
async def query_stream(request: QueryRequest):
    """Stream RAG response via Server-Sent Events."""

    document_dirs = query_service.resolve_document_dirs(request.document_id)
    if not document_dirs and request.document_id:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    # Save user message to conversation
    if request.conversation_id:
        conversation_service.add_message(
            request.conversation_id, "user", request.question
        )

    full_answer = ""
    saved_sources: list[dict] = []  # type: ignore[type-arg]

    async def event_generator():
        nonlocal full_answer, saved_sources

        async for event in iterate_in_threadpool(query_service.query_stream(request)):
            yield f"data: {json.dumps(event)}\n\n"

            if event["type"] == "token":
                full_answer += str(event["content"])
            elif event["type"] == "sources":
                saved_sources = event["content"]  # type: ignore[assignment]
            elif event["type"] == "done":
                if request.conversation_id and full_answer:
                    conversation_service.add_message(
                        request.conversation_id,
                        "assistant",
                        full_answer,
                        sources=saved_sources if saved_sources else None,
                    )
            elif event["type"] == "error":
                if request.conversation_id:
                    conversation_service.add_message(
                        request.conversation_id,
                        "assistant",
                        str(event["content"]),
                    )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
