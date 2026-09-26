import pytest

from app.rag.retriever import BM25Scorer, Retriever


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
