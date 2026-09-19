from __future__ import annotations

import json
import logging
import time
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
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore()

    def process(
        self,
        pdf_path: Path,
    ) -> dict:
        """Process a PDF and return document info."""
        total_start = time.perf_counter()

        logger.info("Extracting markdown from %s...", pdf_path.name)
        start = time.perf_counter()

        markdown = self.loader.extract_markdown(pdf_path)

        logger.info("Markdown extraction completed in %.2fs.", time.perf_counter() - start)

        logger.info("Chunking document...")
        start = time.perf_counter()

        chunks = self.chunker.split(
            markdown=markdown,
            document_id=pdf_path.parent.name,
            source=pdf_path.name,
        )

        logger.info("Created %d chunks in %.2fs.", len(chunks), time.perf_counter() - start)

        # Save chunks with metadata
        chunks_file = pdf_path.parent / "chunks.json"
        chunks_file.write_text(
            json.dumps(
                [chunk.model_dump() for chunk in chunks],
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        logger.info("Generating embeddings...")
        start = time.perf_counter()

        embeddings = self.embedding_service.encode([chunk.content for chunk in chunks])

        logger.info("Embeddings generated in %.2fs.", time.perf_counter() - start)

        self.vector_store.save(
            embeddings=embeddings,
            output_dir=pdf_path.parent,
        )

        total_time = time.perf_counter() - total_start
        logger.info("Pipeline completed in %.2fs.", total_time)

        return {
            "chunk_count": len(chunks),
            "total_chars": sum(c.chunk_length for c in chunks),
            "processing_time": total_time,
        }
