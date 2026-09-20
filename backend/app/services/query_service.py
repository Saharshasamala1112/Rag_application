from __future__ import annotations

import logging
import time
from pathlib import Path

from app.config.settings import settings
from app.exceptions import LLMError
from app.models.request import QueryRequest
from app.models.response import QueryResponse, SourceChunk
from app.rag.llm import LocalLLM
from app.rag.retriever import Retriever
from app.rag.reranker import Reranker

logger = logging.getLogger(__name__)


class QueryService:
    """Handle document queries with advanced RAG techniques."""

    def __init__(self) -> None:
        self.retriever = Retriever()
        self.llm = LocalLLM()
        self.reranker = Reranker()

    def resolve_document_dirs(self, document_id: str | None) -> list[Path]:
        """Resolve which document directories to search."""
        upload_dir = settings.upload_dir

        if document_id:
            doc_dir = upload_dir / document_id
            if doc_dir.exists():
                return [doc_dir]
            return []

        dirs = []
        for child in sorted(upload_dir.iterdir()):
            if child.is_dir() and (child / "chunks.json").exists():
                dirs.append(child)
        return dirs

    def _build_context(self, context_chunks: list[dict]) -> str:
        """Build context string with source metadata for the LLM."""
        parts = []
        for i, chunk in enumerate(context_chunks):
            source = chunk.get("source", "unknown")
            page = chunk.get("page_number")
            header = chunk.get("header")
            meta = f"[Source {i+1}] {source}"
            if page:
                meta += f" (Page {page})"
            if header:
                meta += f" — {header}"
            parts.append(f"{meta}\n{chunk['content']}")
        return "\n\n---\n\n".join(parts)

    def _build_sources(self, context_chunks: list[dict]) -> list[SourceChunk]:
        """Build SourceChunk list with normalized scores."""
        if not context_chunks:
            return []

        scores = [c.get("score", 0.0) for c in context_chunks]
        max_score = max(scores) if scores else 1.0

        sources = []
        for chunk in context_chunks:
            raw_score = chunk.get("score", 0.0)
            normalized = round((raw_score / max_score) * 100) if max_score > 0 else 0
            sources.append(
                SourceChunk(
                    chunk_id=chunk.get("chunk_id", 0),
                    content=chunk["content"][:500],
                    source=chunk.get("source", "unknown"),
                    score=normalized,
                    page_number=chunk.get("page_number"),
                    header=chunk.get("header"),
                )
            )
        return sources

    def query(
        self,
        request: QueryRequest,
    ) -> QueryResponse:
        """Retrieve relevant chunks and generate an answer."""

        total_start = time.perf_counter()

        document_dirs = self.resolve_document_dirs(request.document_id)
        if not document_dirs:
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
            return QueryResponse(
                answer="I couldn't find relevant information in the uploaded documents.",
                sources=[],
                retrieval_time_ms=retrieval_time,
                total_time_ms=(time.perf_counter() - total_start) * 1000,
            )

        # Reranking
        if request.use_reranking and len(results) > top_k:
            results = self.reranker.rerank(
                query=request.question,
                chunks=results,
                top_k=top_k,
            )

        context_chunks = results[:top_k]
        context = self._build_context(context_chunks)

        logger.info("Context length: %d chars from %d chunks.", len(context), len(context_chunks))

        # Generation
        llm_start = time.perf_counter()

        try:
            answer = self.llm.generate(
                question=request.question,
                context=context,
            )
        except LLMError as e:
            return QueryResponse(
                answer=f"LLM error: {e}",
                sources=[],
                retrieval_time_ms=round(retrieval_time, 2),
                total_time_ms=round((time.perf_counter() - total_start) * 1000, 2),
            )

        generation_time = (time.perf_counter() - llm_start) * 1000
        total_time = (time.perf_counter() - total_start) * 1000

        sources = self._build_sources(context_chunks)

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
        """Stream response chunks for SSE."""

        document_dirs = self.resolve_document_dirs(request.document_id)
        if not document_dirs:
            yield {"type": "error", "content": "No documents found."}
            return

        top_k = request.top_k or settings.final_top_k

        results = self.retriever.retrieve(
            question=request.question,
            document_dirs=document_dirs,
            top_k=settings.retrieval_top_k,
        )

        if not results:
            yield {"type": "error", "content": "No relevant information found."}
            return

        if request.use_reranking and len(results) > top_k:
            results = self.reranker.rerank(
                query=request.question,
                chunks=results,
                top_k=top_k,
            )

        context_chunks = results[:top_k]
        context = self._build_context(context_chunks)
        sources = self._build_sources(context_chunks)

        # Send sources first
        yield {
            "type": "sources",
            "content": [s.model_dump() for s in sources],
        }

        # Stream answer
        try:
            for chunk_text in self.llm.generate_stream(
                question=request.question,
                context=context,
            ):
                yield {"type": "token", "content": chunk_text}
        except LLMError as e:
            yield {"type": "error", "content": str(e)}
            return

        yield {"type": "done", "content": ""}
