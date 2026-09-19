from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import numpy as np

from app.config.settings import settings
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)


class BM25Scorer:
    """Simple BM25 scorer for hybrid search."""

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.doc_freqs: dict[str, int] = {}
        self.doc_lens: list[int] = []
        self.avg_doc_len: float = 0.0
        self.num_docs: int = 0

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"\b\w+\b", text.lower())

    def fit(self, documents: list[str]) -> None:
        """Fit BM25 on document corpus."""
        tokenized = [self._tokenize(doc) for doc in documents]
        self.doc_lens = [len(t) for t in tokenized]
        self.avg_doc_len = sum(self.doc_lens) / len(self.doc_lens) if self.doc_lens else 0
        self.num_docs = len(tokenized)

        self.doc_freqs = {}
        for tokens in tokenized:
            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.doc_freqs[token] = self.doc_freqs.get(token, 0) + 1

    def score(self, query: str, doc_idx: int) -> float:
        """Score a query against a document."""
        query_tokens = self._tokenize(query)
        score = 0.0

        for token in query_tokens:
            if token not in self.doc_freqs:
                continue

            df = self.doc_freqs[token]
            idf = max(0, np.log((self.num_docs - df + 0.5) / (df + 0.5) + 1))

            # Term frequency in document (approximate from stored content)
            score += idf

        return float(score)

    def batch_score(self, query: str, doc_indices: list[int]) -> list[float]:
        """Score query against multiple documents."""
        return [self.score(query, idx) for idx in doc_indices]


class Retriever:
    """Hybrid retriever with semantic search, BM25, and reranking."""

    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore()
        self.bm25 = BM25Scorer()

    def _load_chunks(self, document_dir: Path) -> list[dict]:
        """Load chunks from a document directory."""
        chunks_file = document_dir / "chunks.json"
        if not chunks_file.exists():
            return []
        return json.loads(chunks_file.read_text(encoding="utf-8"))

    def retrieve(
        self,
        question: str,
        document_dirs: list[Path],
        top_k: int = settings.retrieval_top_k,
    ) -> list[dict]:
        """Retrieve relevant chunks using hybrid search."""

        all_chunks: list[dict] = []
        all_embeddings: list[np.ndarray] = []

        for doc_dir in document_dirs:
            chunks = self._load_chunks(doc_dir)
            if not chunks:
                continue

            index = self.vector_store.load(doc_dir)
            if index is None:
                continue

            all_chunks.extend(chunks)

            # Get all embeddings from index
            stored_embeddings = self.vector_store.get_embeddings(index)
            all_embeddings.append(stored_embeddings)

        if not all_chunks:
            return []

        # Semantic search
        question_embedding = self.embedding_service.encode([question])

        if all_embeddings:
            combined_embeddings = np.vstack(all_embeddings)
            faiss_index = self.vector_store.build_index(combined_embeddings)
            _, indices = faiss_index.search(question_embedding.astype(np.float32), min(top_k, len(all_chunks)))
            semantic_results = [(int(idx), 1.0) for idx in indices[0] if idx != -1]
        else:
            semantic_results = []

        # BM25 search
        self.bm25.fit([c["content"] for c in all_chunks])
        bm25_scores = self.bm25.batch_score(question, list(range(len(all_chunks))))
        bm25_top = sorted(enumerate(bm25_scores), key=lambda x: x[1], reverse=True)[:top_k]

        # Merge results with RRF (Reciprocal Rank Fusion)
        rrf_scores: dict[int, float] = {}
        k = 60  # RRF constant

        for rank, (idx, _) in enumerate(semantic_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + 1.0 / (k + rank + 1)

        for rank, (idx, _) in enumerate(bm25_top):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + 1.0 / (k + rank + 1)

        # Sort by combined score
        sorted_indices = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:top_k]

        results = []
        for idx in sorted_indices:
            if idx < len(all_chunks):
                chunk = all_chunks[idx].copy()
                chunk["score"] = round(rrf_scores[idx], 4)
                results.append(chunk)

        return results

    def retrieve_from_document(
        self,
        question: str,
        document_dir: Path,
        top_k: int = settings.retrieval_top_k,
    ) -> list[dict]:
        """Retrieve from a single document directory."""
        return self.retrieve(
            question=question,
            document_dirs=[document_dir],
            top_k=top_k,
        )
