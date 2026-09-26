import json
from pathlib import Path

import numpy as np
import pytest

from app.rag.retriever import BM25Scorer, Retriever
from app.rag.vector_store import VectorStore


def test_bm25_cache_fingerprint_tracks_the_entire_corpus():
    Retriever.invalidate_corpus_cache()
    corpus_a = [{"content": "needle needle"}, {"content": "other"}]
    corpus_b = [{"content": "other"}, {"content": "other"}]

    scorer_a = Retriever._get_bm25_scorer(corpus_a)
    score_a = scorer_a.score("needle", 0)
    scorer_b = Retriever._get_bm25_scorer(corpus_b)

    assert scorer_b is not scorer_a
    assert "needle" not in scorer_b.doc_freqs
    assert score_a > 0
    assert scorer_b.score("needle", 0) == 0


def test_bm25_cache_reuses_identical_corpora():
    Retriever.invalidate_corpus_cache()
    chunks = [{"content": "alpha"}, {"content": "beta"}]

    assert Retriever._get_bm25_scorer(chunks) is Retriever._get_bm25_scorer(chunks)


def test_bm25_empty_documents_and_invalid_indices_are_explicit():
    scorer = BM25Scorer()
    scorer.fit(["", ""])

    assert scorer.score("query", 0) == 0
    with pytest.raises(IndexError):
        scorer.score("query", 2)
    with pytest.raises(IndexError):
        scorer.score("query", -1)


def test_bm25_batch_tokenizes_query_once_and_handles_empty_corpus():
    scorer = BM25Scorer()
    scorer.fit(["alpha beta", "", "beta gamma"])
    original_tokenize = scorer._tokenize
    calls = 0

    def count_tokenizations(text: str) -> list[str]:
        nonlocal calls
        calls += 1
        return original_tokenize(text)

    scorer._tokenize = count_tokenizations
    scores = scorer.batch_score("alpha beta", [0, 1, 2])
    assert len(scores) == 3
    assert calls == 1

    empty_scorer = BM25Scorer()
    empty_scorer.fit(["", ""])
    assert empty_scorer.batch_score("query", [0, 1]) == [0.0, 0.0]
    with pytest.raises(IndexError):
        scorer.batch_score("query", [-1])


def test_hybrid_retrieval_fuses_semantic_and_bm25_ranks(tmp_path: Path):
    class QueryEmbedding:
        def encode(self, _texts: list[str]) -> np.ndarray:
            return np.array([[1.0, 0.0]], dtype=np.float32)

    Retriever.invalidate_corpus_cache()
    VectorStore.invalidate_cache()
    document_dir = tmp_path / "document"
    document_dir.mkdir()
    chunks = [
        {"chunk_id": 0, "content": "common alpha", "source": "doc.txt"},
        {"chunk_id": 1, "content": "needle needle", "source": "doc.txt"},
        {"chunk_id": 2, "content": "common gamma", "source": "doc.txt"},
    ]
    (document_dir / "chunks.json").write_text(json.dumps(chunks), encoding="utf-8")
    VectorStore.save(
        np.array([[1.0, 0.0], [0.0, 1.0], [0.6, 0.8]], dtype=np.float32),
        document_dir,
    )

    retriever = Retriever.__new__(Retriever)
    retriever.embedding_service = QueryEmbedding()
    retriever.vector_store = VectorStore()

    results = retriever.retrieve("needle", [document_dir], top_k=3)

    assert [chunk["chunk_id"] for chunk in results] == [0, 1, 2]
    assert results[0]["score"] > results[1]["score"] > results[2]["score"]
