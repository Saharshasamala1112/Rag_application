from app.rag.reranker import Reranker


def test_reranker_uses_model_scores_to_order_candidates():
    class Model:
        def predict(self, pairs: list[tuple[str, str]]) -> list[float]:
            assert pairs == [
                ("question", "low relevance"),
                ("question", "high relevance"),
            ]
            return [0.1, 0.9]

    reranker = Reranker()
    reranker._model = Model()
    chunks = [
        {"content": "low relevance", "chunk_id": 1},
        {"content": "high relevance", "chunk_id": 2},
    ]

    results = reranker.rerank("question", chunks, top_k=1)

    assert [chunk["chunk_id"] for chunk in results] == [2]
    assert results[0]["rerank_score"] == 0.9
