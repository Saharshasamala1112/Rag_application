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
        model_name = "BAAI/bge-small-en-v1.5"
        revision = None
        dimension = 2

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


def test_retriever_skips_incompatible_embedding_indexes_without_touching_files(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
):
    class QueryEmbedding:
        model_name = "BAAI/bge-small-en-v1.5"
        revision = None
        dimension = 2

        def encode(self, _texts: list[str]) -> np.ndarray:
            return np.array([[1.0, 0.0]], dtype=np.float32)

    def make_document(name: str) -> Path:
        directory = tmp_path / name
        directory.mkdir()
        (directory / "chunks.json").write_text(
            json.dumps([{"chunk_id": 0, "content": "needle", "source": f"{name}.txt"}]),
            encoding="utf-8",
        )
        return directory

    Retriever.invalidate_corpus_cache()
    VectorStore.invalidate_cache()

    # Legacy document: no provenance, index dimension matches — stays usable.
    legacy = make_document("legacy")
    VectorStore.save(np.array([[1.0, 0.0]], dtype=np.float32), legacy)

    # Wrong vector dimension — must be skipped, never handed to FAISS.
    wrong_dimension = make_document("wrong-dimension")
    VectorStore.save(np.array([[1.0, 0.0, 0.0]], dtype=np.float32), wrong_dimension)

    # Right dimension but indexed with a different model — must be skipped.
    wrong_model = make_document("wrong-model")
    VectorStore.save(np.array([[1.0, 0.0]], dtype=np.float32), wrong_model)
    (wrong_model / "document_info.json").write_text(
        json.dumps(
            {
                "status": "ready",
                "chunk_count": 1,
                "embedding_model": "acme/other-model",
                "embedding_revision": None,
                "embedding_dim": 2,
            }
        ),
        encoding="utf-8",
    )

    retriever = Retriever.__new__(Retriever)
    retriever.embedding_service = QueryEmbedding()
    retriever.vector_store = VectorStore()

    results = retriever.retrieve(
        "needle", [legacy, wrong_dimension, wrong_model], top_k=3
    )

    assert {chunk["source"] for chunk in results} == {"legacy.txt"}
    assert "Skipping incompatible document index" in caplog.text
    assert "acme/other-model" in caplog.text

    # Compatibility failures must never modify stored data.
    assert (wrong_dimension / "faiss.index").is_file()
    assert (wrong_model / "faiss.index").is_file()
    stored_info = json.loads(
        (wrong_model / "document_info.json").read_text(encoding="utf-8")
    )
    assert stored_info["embedding_model"] == "acme/other-model"


@pytest.mark.parametrize(
    "metadata_payload",
    ["[1, 2, 3]", '"just a string"', "42", "{not json"],
    ids=["list-root", "string-root", "int-root", "malformed-json"],
)
def test_retriever_skips_invalid_metadata_without_crashing(
    tmp_path: Path, caplog: pytest.LogCaptureFixture, metadata_payload: str
):
    """Regression: invalid document_info.json must be skipped, not crash retrieve().

    A truthy non-dict root (e.g. ``[1, 2, 3]``) used to raise AttributeError on
    ``provenance.get(...)`` inside the compatibility check, crashing retrieval.
    Invalid metadata is now refused and the document excluded, consistent with
    the readiness gate.
    """

    class QueryEmbedding:
        model_name = "BAAI/bge-small-en-v1.5"
        revision = None
        dimension = 2

        def encode(self, _texts: list[str]) -> np.ndarray:
            return np.array([[1.0, 0.0]], dtype=np.float32)

    Retriever.invalidate_corpus_cache()
    VectorStore.invalidate_cache()

    def make_document(name: str) -> Path:
        directory = tmp_path / name
        directory.mkdir()
        (directory / "chunks.json").write_text(
            json.dumps([{"chunk_id": 0, "content": "needle", "source": f"{name}.txt"}]),
            encoding="utf-8",
        )
        return directory

    # Usable legacy document (no metadata) — must still be returned.
    legacy = make_document("legacy")
    VectorStore.save(np.array([[1.0, 0.0]], dtype=np.float32), legacy)

    # Document whose metadata root is invalid — must be skipped, never crash.
    invalid = make_document("invalid-metadata")
    VectorStore.save(np.array([[1.0, 0.0]], dtype=np.float32), invalid)
    (invalid / "document_info.json").write_text(metadata_payload, encoding="utf-8")

    retriever = Retriever.__new__(Retriever)
    retriever.embedding_service = QueryEmbedding()
    retriever.vector_store = VectorStore()

    results = retriever.retrieve("needle", [legacy, invalid], top_k=3)

    assert {chunk["source"] for chunk in results} == {"legacy.txt"}
    # The invalid document is refused with an actionable error, not crashed on.
    assert "Skipping incompatible document index" in caplog.text
    assert "unusable index metadata" in caplog.text
    # ...and its refusal is never framed as a legacy acceptance. (The only
    # legacy-policy warning comes from the genuinely legacy document.)
    legacy_lines = [
        line for line in caplog.text.splitlines() if "legacy policy" in line
    ]
    assert legacy_lines, "the legacy document should still be accepted with a warning"
    assert all("'legacy'" in line for line in legacy_lines)
    # The refusal must not modify the stored (invalid) metadata file.
    assert (invalid / "document_info.json").read_text(encoding="utf-8") == (
        metadata_payload
    )
