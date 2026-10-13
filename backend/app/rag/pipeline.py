from __future__ import annotations

import json
import logging
import os
import time
import uuid
from pathlib import Path

from app.rag.chunking import DocumentChunker
from app.rag.document_loader import DocumentLoader
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)


class DocumentPipeline:
    """Complete document processing pipeline with metadata."""

    def __init__(self) -> None:
        self.loader = DocumentLoader()
        self.chunker = DocumentChunker()
        self.embedding_service: EmbeddingService | None = None
        self.vector_store = VectorStore()

    def process(
        self,
        file_path: Path,
    ) -> dict:
        """Process a document file and return document info."""
        total_start = time.perf_counter()

        logger.info("Extracting text from %s...", file_path.name)
        start = time.perf_counter()

        markdown = self.loader.extract_markdown(file_path)

        if not markdown or not markdown.strip():
            raise ValueError("No text content could be extracted from the document.")

        logger.info("Text extraction completed in %.2fs.", time.perf_counter() - start)

        logger.info("Chunking document...")
        start = time.perf_counter()

        chunks = self.chunker.split(
            markdown=markdown,
            document_id=file_path.parent.name,
            source=file_path.name,
        )

        logger.info("Created %d chunks in %.2fs.", len(chunks), time.perf_counter() - start)
        if not chunks:
            raise ValueError("No text chunks could be generated from the document.")

        logger.info("Generating embeddings...")
        start = time.perf_counter()

        if self.embedding_service is None:
            self.embedding_service = EmbeddingService.get_instance()
        embeddings = self.embedding_service.encode([chunk.content for chunk in chunks])

        logger.info("Embeddings generated in %.2fs.", time.perf_counter() - start)

        self.vector_store.save(
            embeddings=embeddings,
            output_dir=file_path.parent,
        )

        chunks_file = file_path.parent / "chunks.json"
        temporary_chunks_file = (
            file_path.parent / f".chunks-{uuid.uuid4().hex}.tmp"
        )
        try:
            temporary_chunks_file.write_text(
                json.dumps(
                    [chunk.model_dump() for chunk in chunks],
                    indent=2,
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            os.replace(temporary_chunks_file, chunks_file)
        finally:
            temporary_chunks_file.unlink(missing_ok=True)

        total_time = time.perf_counter() - total_start
        logger.info("Pipeline completed in %.2fs.", total_time)

        return {
            "chunk_count": len(chunks),
            "total_chars": sum(c.chunk_length for c in chunks),
            "processing_time": total_time,
            # Provenance: which embedding configuration produced the index so
            # retrieval can refuse stale or foreign indexes (BE-04).
            "embedding_model": self.embedding_service.model_name,
            "embedding_revision": self.embedding_service.revision,
            "embedding_dim": self.embedding_service.dimension,
        }
