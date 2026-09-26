from __future__ import annotations

import hashlib
import json
import logging
import re
import threading
from collections import OrderedDict
from pathlib import Path

import faiss
import numpy as np

from app.config.settings import settings
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)


class BM25Scorer:
    """BM25 scorer with proper term frequency per document."""

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.doc_freqs: dict[str, int] = {}
        self.doc_tfs: list[dict[str, int]] = []
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

        # Document frequencies (how many docs contain each term)
        self.doc_freqs = {}
        for tokens in tokenized:
            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.doc_freqs[token] = self.doc_freqs.get(token, 0) + 1

        # Per-document term frequencies
        self.doc_tfs = []
        for tokens in tokenized:
            tf: dict[str, int] = {}
            for token in tokens:
                tf[token] = tf.get(token, 0) + 1
            self.doc_tfs.append(tf)

    def score(self, query: str, doc_idx: int) -> float:
        """Score a query against a specific document."""
        if not 0 <= doc_idx < len(self.doc_tfs):
            raise IndexError(f"BM25 document index out of range: {doc_idx}")
        return self._score_tokens(self._tokenize(query), doc_idx)

    def _score_tokens(self, query_tokens: list[str], doc_idx: int) -> float:
        if not 0 <= doc_idx < len(self.doc_tfs):
            raise IndexError(f"BM25 document index out of range: {doc_idx}")
        if self.avg_doc_len == 0:
            return 0.0

        tf = self.doc_tfs[doc_idx]
        doc_len = self.doc_lens[doc_idx]
        score = 0.0

        for token in query_tokens:
            if token not in self.doc_freqs:
                continue

            df = self.doc_freqs[token]
            idf = np.log((self.num_docs - df + 0.5) / (df + 0.5) + 1)

            term_freq = tf.get(token, 0)
            tf_norm = (term_freq * (self.k1 + 1)) / (
                term_freq + self.k1 * (1 - self.b + self.b * doc_len / self.avg_doc_len)
            )

            score += idf * tf_norm

        return float(score)

    def batch_score(self, query: str, doc_indices: list[int]) -> list[float]:
        """Score query against multiple documents."""
        query_tokens = self._tokenize(query)
        return [self._score_tokens(query_tokens, idx) for idx in doc_indices]


class Retriever:
    """Hybrid retriever with semantic search, BM25, and RRF fusion."""

    _bm25_cache: OrderedDict[str, BM25Scorer] = OrderedDict()
    _bm25_cache_lock = threading.RLock()
    _bm25_cache_limit = 16

    def __init__(self) -> None:
        self.embedding_service = EmbeddingService.get_instance()
        self.vector_store = VectorStore()

    @classmethod
    def _get_bm25_scorer(cls, chunks: list[dict]) -> BM25Scorer:
        fingerprint = hashlib.sha256()
        for chunk in chunks:
            content = chunk["content"].encode("utf-8")
            fingerprint.update(len(content).to_bytes(8, "big"))
            fingerprint.update(content)
        cache_key = fingerprint.hexdigest()

        with cls._bm25_cache_lock:
            scorer = cls._bm25_cache.get(cache_key)
            if scorer is not None:
                cls._bm25_cache.move_to_end(cache_key)
                return scorer

            scorer = BM25Scorer()
            scorer.fit([chunk["content"] for chunk in chunks])
            cls._bm25_cache[cache_key] = scorer
            if len(cls._bm25_cache) > cls._bm25_cache_limit:
                cls._bm25_cache.popitem(last=False)
            return scorer

    @classmethod
    def invalidate_corpus_cache(cls) -> None:
        with cls._bm25_cache_lock:
            cls._bm25_cache.clear()
        VectorStore.invalidate_cache()

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
        """Retrieve relevant chunks using hybrid search with RRF fusion."""

        all_chunks: list[dict] = []
        valid_document_dirs: list[Path] = []
        stored_indexes: list[faiss.Index] = []

        for doc_dir in document_dirs:
            chunks = self._load_chunks(doc_dir)
            if not chunks:
                continue

            index = self.vector_store.load(doc_dir)
            if index is None:
                continue
            if index.ntotal != len(chunks):
                logger.error(
                    "Skipping stale document index %s: index has %d vectors for %d chunks.",
                    doc_dir,
                    index.ntotal,
                    len(chunks),
                )
                continue

            all_chunks.extend(chunks)
            valid_document_dirs.append(doc_dir)
            stored_indexes.append(index)

        if not all_chunks:
            return []

        # Semantic search
        question_embedding = self.embedding_service.encode([question])

        faiss_index = self.vector_store.search_index(
            valid_document_dirs,
            stored_indexes,
        )
        if faiss_index is not None:
            search_k = min(top_k * 2, len(all_chunks))
            _, indices = faiss_index.search(question_embedding.astype(np.float32), search_k)
            semantic_results = [(int(idx), 1.0) for idx in indices[0] if idx != -1]
        else:
            semantic_results = []

        bm25 = self._get_bm25_scorer(all_chunks)
        bm25_scores = bm25.batch_score(question, list(range(len(all_chunks))))
        bm25_search_k = min(top_k * 2, len(all_chunks))
        bm25_top = sorted(enumerate(bm25_scores), key=lambda x: x[1], reverse=True)[:bm25_search_k]

        # Merge with Reciprocal Rank Fusion
        rrf_scores: dict[int, float] = {}
        k = 60

        for rank, (idx, _) in enumerate(semantic_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + 1.0 / (k + rank + 1)

        for rank, (idx, _) in enumerate(bm25_top):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + 1.0 / (k + rank + 1)

        sorted_indices = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:top_k]

        results = []
        for idx in sorted_indices:
            if idx < len(all_chunks):
                chunk = all_chunks[idx].copy()
                chunk["score"] = round(rrf_scores[idx], 4)
                results.append(chunk)

        return results
