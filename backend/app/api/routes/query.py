import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool

from app.exceptions import LLMError
from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.query_stream_contract import QUERY_STREAM_EVENTS
from app.services import conversation_service
from app.services.query_service import QueryService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Query"])

query_service = QueryService()


@router.post("/query", response_model=QueryResponse)
def query(request: QueryRequest) -> QueryResponse:
    """Query documents with RAG."""
    document_dirs = query_service.resolve_document_dirs(request.document_id)

    if not document_dirs and request.document_id:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    # Save user message to conversation
    if request.conversation_id:
        saved_message = conversation_service.add_message(
            request.conversation_id, "user", request.question
        )
        if saved_message is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")

    try:
        result = query_service.query(request)
    except LLMError as error:
        logger.exception("Query generation failed.")
        raise HTTPException(
            status_code=503,
            detail="The language model is temporarily unavailable.",
        ) from error

    if request.conversation_id and not result.answer.startswith("LLM error:"):
        saved_message = conversation_service.add_message(
            request.conversation_id,
            "assistant",
            result.answer,
            sources=[source.model_dump() for source in result.sources],
        )
        if saved_message is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")

    return result


@router.post(
    "/query/stream",
    response_class=StreamingResponse,
    responses={
        200: {
            "content": {
                "text/event-stream": {"schema": {"type": "string"}},
            }
        }
    },
)
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
        saved_message = conversation_service.add_message(
            request.conversation_id, "user", request.question
        )
        if saved_message is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")

    full_answer = ""
    saved_sources: list[dict] = []  # type: ignore[type-arg]

    async def event_generator():
        nonlocal full_answer, saved_sources
        stream_completed = False
        stream_failed = False

        try:
            async for event in iterate_in_threadpool(
                query_service.query_stream(request)
            ):
                if event["type"] == QUERY_STREAM_EVENTS["error"]:
                    stream_failed = True
                yield f"data: {json.dumps(event)}\n\n"

                if event["type"] == QUERY_STREAM_EVENTS["token"]:
                    full_answer += str(event["content"])
                elif event["type"] == QUERY_STREAM_EVENTS["sources"]:
                    saved_sources = event["content"]  # type: ignore[assignment]
                elif event["type"] == QUERY_STREAM_EVENTS["done"]:
                    stream_completed = True
                    if request.conversation_id and full_answer:
                        conversation_service.add_message(
                            request.conversation_id,
                            "assistant",
                            full_answer,
                            sources=saved_sources if saved_sources else None,
                        )
                elif event["type"] == QUERY_STREAM_EVENTS["error"]:
                    logger.error("Streaming query failed: %s", event["content"])
        finally:
            if (
                request.conversation_id
                and full_answer
                and not stream_completed
                and not stream_failed
            ):
                conversation_service.add_message(
                    request.conversation_id,
                    "assistant",
                    full_answer,
                    sources=saved_sources if saved_sources else None,
                    interrupted=True,
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
