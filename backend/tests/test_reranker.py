import math

import pytest

from app.rag.reranker import Reranker


def test_reranker_uses_model_scores_to_order_candidates():
    class Model:
        def predict(self, pairs: list[tuple[str, str]]) -> list[float]:
            assert pairs == [
                ("question", "low relevance"),
                ("question", "high relevance"),
            ]
            return [-math.log(9), math.log(9)]

    reranker = Reranker()
    reranker._model = Model()
    chunks = [
        {"content": "low relevance", "chunk_id": 1},
        {"content": "high relevance", "chunk_id": 2},
    ]

    results = reranker.rerank("question", chunks, top_k=1)

    assert [chunk["chunk_id"] for chunk in results] == [2]
    assert results[0]["rerank_score"] == pytest.approx(0.9)


def test_reranker_converts_raw_logits_to_probabilities():
    class Model:
        def predict(self, pairs: list[tuple[str, str]]) -> list[float]:
            assert len(pairs) == 3
            return [-8.0, 0.0, 3.5]

    reranker = Reranker()
    reranker._model = Model()
    chunks = [
        {"content": "first", "chunk_id": 1},
        {"content": "second", "chunk_id": 2},
        {"content": "third", "chunk_id": 3},
    ]

    results = reranker.rerank("question", chunks, top_k=3)

    scores = [chunk["rerank_score"] for chunk in results]
    assert scores == pytest.approx(
        [1 / (1 + math.exp(-3.5)), 0.5, 1 / (1 + math.exp(8))]
    )
    assert all(0.0 < score < 1.0 for score in scores)
