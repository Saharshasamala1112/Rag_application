import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import faiss
import numpy as np

from app.rag.retriever import Retriever
from app.rag.vector_store import VectorStore


def test_load_caches_unchanged_faiss_index(tmp_path: Path):
    store = VectorStore()
    VectorStore.invalidate_cache()
    store.save(np.array([[1.0, 0.0]], dtype=np.float32), tmp_path)

    first = store.load(tmp_path)
    second = store.load(tmp_path)

    assert first is not None
    assert first is second


def test_saved_index_round_trips_embeddings_and_search_results(tmp_path: Path):
    vectors = np.array(
        [[1.0, 0.0], [0.0, 1.0], [0.6, 0.8]],
        dtype=np.float32,
    )
    VectorStore.invalidate_cache()
    VectorStore.save(vectors, tmp_path)

    loaded = VectorStore().load(tmp_path)

    assert loaded is not None
    np.testing.assert_allclose(VectorStore.get_embeddings(loaded), vectors)
    _, indices = loaded.search(np.array([[1.0, 0.0]], dtype=np.float32), 3)
    assert indices[0].tolist() == [0, 2, 1]


def test_corrupt_faiss_index_is_refused(tmp_path: Path):
    (tmp_path / "faiss.index").write_bytes(b"corrupt index")

    assert VectorStore.load(tmp_path) is None


def test_combined_search_index_is_cached_for_unchanged_documents(tmp_path: Path):
    VectorStore.invalidate_cache()
    directories = [tmp_path / "first", tmp_path / "second"]
    indexes = []
    store = VectorStore()

    for directory, vector, content in zip(
        directories,
        ([1.0, 0.0], [0.0, 1.0]),
        ("first", "second"),
    ):
        directory.mkdir()
        (directory / "chunks.json").write_text(
            json.dumps([{"content": content}]),
            encoding="utf-8",
        )
        store.save(np.array([vector], dtype=np.float32), directory)
        index = store.load(directory)
        assert index is not None
        indexes.append(index)

    first = store.search_index(directories, indexes)
    second = store.search_index(directories, indexes)

    assert first is not None
    assert first.ntotal == 2
    assert second is first


def test_retriever_skips_index_chunk_count_mismatch(
    tmp_path: Path, caplog
):
    document_dir = tmp_path / "document"
    document_dir.mkdir()
    (document_dir / "chunks.json").write_text(
        json.dumps([{"chunk_id": 0, "content": "one chunk"}]),
        encoding="utf-8",
    )
    stale_index = faiss.IndexFlatIP(2)
    stale_index.add(np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32))
    retriever = Retriever.__new__(Retriever)
    retriever.embedding_service = None
    retriever.vector_store = VectorStore()
    retriever.vector_store.load = lambda _directory: stale_index

    assert retriever.retrieve("query", [document_dir]) == []
    assert "Skipping stale document index" in caplog.text


def test_concurrent_retrieval_keeps_document_scopes_isolated(tmp_path: Path):
    class QueryEmbedding:
        model_name = "BAAI/bge-small-en-v1.5"
        revision = None
        dimension = 2

        def encode(self, texts: list[str]) -> np.ndarray:
            vector = [1.0, 0.0] if texts[0] == "first" else [0.0, 1.0]
            return np.array([vector], dtype=np.float32)

    store = VectorStore()
    retriever = Retriever.__new__(Retriever)
    retriever.embedding_service = QueryEmbedding()
    retriever.vector_store = store
    documents = {}
    for name, vector in (("first", [1.0, 0.0]), ("second", [0.0, 1.0])):
        directory = tmp_path / name
        directory.mkdir()
        (directory / "chunks.json").write_text(
            json.dumps([
                {
                    "chunk_id": 0,
                    "content": f"content exclusive to {name}",
                    "source": f"{name}.txt",
                }
            ]),
            encoding="utf-8",
        )
        store.save(np.array([vector], dtype=np.float32), directory)
        documents[name] = directory

    requests = ["first", "second"] * 20
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(
            executor.map(
                lambda name: retriever.retrieve(name, [documents[name]]),
                requests,
            )
        )

    for name, chunks in zip(requests, results):
        assert len(chunks) == 1
        assert chunks[0]["content"] == f"content exclusive to {name}"
