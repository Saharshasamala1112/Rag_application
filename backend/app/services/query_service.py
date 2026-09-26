from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from pathlib import Path

from app.config.settings import settings
from app.exceptions import LLMError
from app.models.request import QueryRequest
from app.models.response import QueryResponse, SourceChunk
from app.query_stream_contract import (
    QUERY_STREAM_EVENTS,
    QUERY_STREAM_STATUSES,
    QUERY_STREAM_TRACE_STEPS,
)
from app.rag.llm import LocalLLM
from app.rag.reranker import Reranker
from app.rag.retriever import Retriever
from app.services import conversation_service
from app.services.upload_service import resolve_document_dir

logger = logging.getLogger(__name__)

# Approximate token budget for context (leaves room for prompt + answer)
MAX_CONTEXT_CHARS = 6000
MAX_HISTORY_MESSAGES = 12
MAX_HISTORY_MESSAGE_CHARS = 4000


class QueryService:
    """Handle document queries with advanced RAG techniques."""

    def __init__(self) -> None:
        self._retriever: Retriever | None = None
        self._llm: LocalLLM | None = None
        self.reranker = Reranker()
        self._components_lock = threading.RLock()

    @property
    def retriever(self) -> Retriever:
        if self._retriever is None:
            with self._components_lock:
                if self._retriever is None:
                    self._retriever = Retriever()
        return self._retriever

    @retriever.setter
    def retriever(self, value: Retriever) -> None:
        self._retriever = value

    @property
    def llm(self) -> LocalLLM:
        if self._llm is None:
            with self._components_lock:
                if self._llm is None:
                    self._llm = LocalLLM()
        return self._llm

    @llm.setter
    def llm(self, value: LocalLLM) -> None:
        self._llm = value

    @staticmethod
    def _is_document_ready(document_dir: Path) -> bool:
        if not (document_dir / "chunks.json").is_file():
            return False
        if not (document_dir / "faiss.index").is_file():
            return False

        info_file = document_dir / "document_info.json"
        if info_file.exists():
            try:
                info = json.loads(info_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return False
            if info.get("status") not in (None, "ready"):
                return False
        return True

    def resolve_document_dirs(self, document_id: str | None) -> list[Path]:
        """Resolve which document directories to search."""
        upload_dir = settings.upload_dir

        if document_id:
            try:
                doc_dir = resolve_document_dir(document_id)
            except ValueError:
                return []
            if self._is_document_ready(doc_dir):
                return [doc_dir]
            return []

        dirs = []
        for child in sorted(upload_dir.iterdir()):
            try:
                document_dir = resolve_document_dir(child.name)
            except ValueError:
                continue
            if document_dir.is_dir() and self._is_document_ready(document_dir):
                dirs.append(document_dir)
        return dirs

    def _deduplicate_chunks(self, chunks: list[dict]) -> list[dict]:
        """Remove duplicate chunks by content similarity."""
        seen: set[str] = set()
        unique: list[dict] = []
        for chunk in chunks:
            key = chunk["content"][:200].strip().lower()
            if key not in seen:
                seen.add(key)
                unique.append(chunk)
        return unique

    def _build_context(self, context_chunks: list[dict]) -> str:
        """Build context string with source metadata, respecting token budget."""
        parts: list[str] = []
        total_chars = 0

        for i, chunk in enumerate(context_chunks):
            source = chunk.get("source", "unknown")
            page = chunk.get("page_number")
            header = chunk.get("header")
            meta = f"[Source {i+1}] {source}"
            if page:
                meta += f" (Page {page})"
            if header:
                meta += f" \u2014 {header}"

            content = chunk["content"]
            part = f"{meta}\n{content}"

            if total_chars + len(part) > MAX_CONTEXT_CHARS:
                remaining = MAX_CONTEXT_CHARS - total_chars
                if remaining > 100:
                    content = content[: remaining - len(meta) - 10] + "..."
                    parts.append(f"{meta}\n{content}")
                break

            parts.append(part)
            total_chars += len(part)

        return "\n\n---\n\n".join(parts)

    def _build_sources(self, context_chunks: list[dict]) -> list[SourceChunk]:
        """Build SourceChunk list with normalized scores."""
        if not context_chunks:
            return []

        scores = [
            c.get("rerank_score", c.get("score", 0.0))
            for c in context_chunks
        ]
        max_score = max(scores) if scores else 1.0
        min_score = min(scores) if scores else 0.0

        sources = []
        for chunk in context_chunks:
            raw_score = chunk.get("rerank_score", chunk.get("score", 0.0))
            if max_score > 0:
                normalized = min(max(raw_score / max_score, 0.0), 1.0)
            elif max_score > min_score:
                normalized = (raw_score - min_score) / (max_score - min_score)
            else:
                normalized = 1.0
            sources.append(
                SourceChunk(
                    chunk_id=chunk.get("chunk_id", 0),
                    content=chunk["content"][:500],
                    source=chunk.get("source", "unknown"),
                    score=round(normalized, 4),
                    page_number=chunk.get("page_number"),
                    header=chunk.get("header"),
                )
            )
        return sources

    def _conversation_history(self, request: QueryRequest) -> list[dict[str, str]]:
        if not request.conversation_id:
            return []

        conversation = conversation_service.get_conversation(request.conversation_id)
        if not conversation:
            return []

        messages = conversation.get("messages", [])
        if (
            messages
            and messages[-1].get("role") == "user"
            and messages[-1].get("content") == request.question
        ):
            messages = messages[:-1]

        return [
            {
                "role": message["role"],
                "content": message["content"][:MAX_HISTORY_MESSAGE_CHARS],
            }
            for message in messages[-MAX_HISTORY_MESSAGES:]
            if message.get("role") in {"user", "assistant"}
            and isinstance(message.get("content"), str)
        ]

    def query(
        self,
        request: QueryRequest,
    ) -> QueryResponse:
        """Retrieve relevant chunks and generate an answer."""

        total_start = time.perf_counter()
        request_id = uuid.uuid4().hex[:8]

        document_dirs = self.resolve_document_dirs(request.document_id)
        if not document_dirs:
            if request.use_reranking:
                logger.warning("Reranking requested but no documents were found.")
            return QueryResponse(
                answer="No documents found. Please upload a document first.",
                sources=[],
                total_time_ms=0,
            )

        # Retrieval
        retrieval_start = time.perf_counter()
        top_k = request.top_k or settings.final_top_k

        results = self.retriever.retrieve(
            question=request.question,
            document_dirs=document_dirs,
            top_k=settings.retrieval_top_k,
        )

        retrieval_time = (time.perf_counter() - retrieval_start) * 1000

        if not results:
            if request.use_reranking:
                logger.warning("Reranking requested but no candidates were retrieved.")
            return QueryResponse(
                answer="I couldn't find relevant information in the uploaded documents.",
                sources=[],
                retrieval_time_ms=retrieval_time,
                total_time_ms=(time.perf_counter() - total_start) * 1000,
            )

        # Deduplicate
        results = self._deduplicate_chunks(results)

        # Reranking
        if request.use_reranking and results:
            results = self.reranker.rerank(
                query=request.question,
                chunks=results,
                top_k=top_k,
            )

        context_chunks = results[:top_k]
        context = self._build_context(context_chunks)

        logger.info(
            "[%s] Context: %d chars from %d chunks. Retrieval: %.0fms",
            request_id, len(context), len(context_chunks), retrieval_time,
        )

        # Generation
        llm_start = time.perf_counter()

        answer = self.llm.generate(
            question=request.question,
            context=context,
            history=self._conversation_history(request),
        )

        generation_time = (time.perf_counter() - llm_start) * 1000
        total_time = (time.perf_counter() - total_start) * 1000

        sources = self._build_sources(context_chunks)

        logger.info(
            "[%s] Generation: %.0fms. Total: %.0fms. Sources: %d",
            request_id, generation_time, total_time, len(sources),
        )

        return QueryResponse(
            answer=answer,
            sources=sources,
            retrieval_time_ms=round(retrieval_time, 2),
            generation_time_ms=round(generation_time, 2),
            total_time_ms=round(total_time, 2),
        )

    def query_stream(
        self,
        request: QueryRequest,
    ):
        """Stream response chunks for SSE with progress events."""

        request_id = uuid.uuid4().hex[:8]
        document_dirs = self.resolve_document_dirs(request.document_id)

        if not document_dirs:
            yield {
                "type": QUERY_STREAM_EVENTS["error"],
                "content": "No documents found. Please upload a document first.",
            }
            return

        # Progress: retrieving
        yield {
            "type": QUERY_STREAM_EVENTS["status"],
            "content": QUERY_STREAM_STATUSES["retrieving"]["text"],
        }

        top_k = request.top_k or settings.final_top_k

        retrieval_start = time.perf_counter()

        results = self.retriever.retrieve(
            question=request.question,
            document_dirs=document_dirs,
            top_k=settings.retrieval_top_k,
        )

        retrieval_time_ms = round((time.perf_counter() - retrieval_start) * 1000, 1)

        if not results:
            if request.use_reranking:
                logger.warning("Reranking requested but no candidates were retrieved.")
            yield {
                "type": QUERY_STREAM_EVENTS["error"],
                "content": "No relevant information found in the documents.",
            }
            return

        # Trace: retrieval complete
        yield {
            "type": QUERY_STREAM_EVENTS["trace"],
            "content": {
                "step": QUERY_STREAM_TRACE_STEPS[0],
                "timing_ms": retrieval_time_ms,
                "chunks_found": len(results),
                "documents_searched": len(document_dirs),
            },
        }

        # Progress: processing
        yield {
            "type": QUERY_STREAM_EVENTS["status"],
            "content": QUERY_STREAM_STATUSES["reranking"]["text"],
        }

        # Deduplicate
        results = self._deduplicate_chunks(results)

        rerank_time_ms = 0.0
        if request.use_reranking and results:
            rerank_start = time.perf_counter()
            results = self.reranker.rerank(
                query=request.question,
                chunks=results,
                top_k=top_k,
            )
            rerank_time_ms = round((time.perf_counter() - rerank_start) * 1000, 1)

            # Trace: reranking complete
            yield {
                "type": QUERY_STREAM_EVENTS["trace"],
                "content": {
                    "step": QUERY_STREAM_TRACE_STEPS[1],
                    "timing_ms": rerank_time_ms,
                    "chunks_after_rerank": len(results),
                },
            }

        context_chunks = results[:top_k]
        yield {
            "type": QUERY_STREAM_EVENTS["status"],
            "content": QUERY_STREAM_STATUSES["context"]["text"],
        }
        context = self._build_context(context_chunks)
        sources = self._build_sources(context_chunks)

        # Trace: context built
        yield {
            "type": QUERY_STREAM_EVENTS["trace"],
            "content": {
                "step": QUERY_STREAM_TRACE_STEPS[2],
                "context_chars": len(context),
                "context_chunks": len(context_chunks),
                "sources_count": len(sources),
            },
        }

        logger.info("[%s] Streaming query with %d sources.", request_id, len(sources))

        # Send sources first
        yield {
            "type": QUERY_STREAM_EVENTS["sources"],
            "content": [s.model_dump() for s in sources],
        }

        # Progress: generating
        yield {
            "type": QUERY_STREAM_EVENTS["status"],
            "content": QUERY_STREAM_STATUSES["generating"]["text"],
        }

        generation_start = time.perf_counter()

        # Stream answer
        try:
            for chunk_text in self.llm.generate_stream(
                question=request.question,
                context=context,
                history=self._conversation_history(request),
            ):
                yield {"type": QUERY_STREAM_EVENTS["token"], "content": chunk_text}
        except LLMError:
            logger.exception("Streaming query generation failed.")
            yield {
                "type": QUERY_STREAM_EVENTS["error"],
                "content": "The language model is temporarily unavailable.",
            }
            return

        generation_time_ms = round((time.perf_counter() - generation_start) * 1000, 1)
        total_time_ms = round(retrieval_time_ms + rerank_time_ms + generation_time_ms, 1)

        # Trace: generation complete
        yield {
            "type": QUERY_STREAM_EVENTS["trace"],
            "content": {
                "step": QUERY_STREAM_TRACE_STEPS[3],
                "timing_ms": generation_time_ms,
            },
        }

        yield {
            "type": QUERY_STREAM_EVENTS["done"],
            "content": "",
            "total_time_ms": total_time_ms,
        }
