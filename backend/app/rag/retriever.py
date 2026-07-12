from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import VectorStore


class Retriever:
    """Retrieve relevant chunks from a FAISS index."""

    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore()

    def retrieve(
        self,
        document_dir: Path,
        question: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Retrieve the most relevant chunks."""

        index = self.vector_store.load(document_dir)

        chunks = json.loads(
            (document_dir / "chunks.json").read_text(
                encoding="utf-8",
            )
        )

        question_embedding = self.embedding_service.encode(
            [question],
        )

        _, indices = index.search(
            question_embedding.astype(np.float32),
            top_k,
        )

        results: list[dict] = []

        for index_id in indices[0]:
            if index_id == -1:
                continue

            results.append(chunks[index_id])

        return results
