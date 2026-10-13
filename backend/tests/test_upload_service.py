import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from app.config.settings import settings
from app.rag.pipeline import DocumentPipeline
from app.rag.vector_store import VectorStore
from app.services import upload_service as upload_service_module
from app.services.upload_service import (
    UploadQuotaExceededError,
    UploadService,
    UploadTooLargeError,
    resolve_document_dir,
)


def test_upload_stream_rejects_oversize_and_removes_partial_data(tmp_path: Path):
    service = UploadService.__new__(UploadService)
    service.pipeline = MagicMock()

    with patch.object(settings, "upload_dir", tmp_path):
        with pytest.raises(UploadTooLargeError):
            service.process_upload_stream(BytesIO(b"too large"), "doc.txt", max_size=3)

    assert list(tmp_path.iterdir()) == []
    service.pipeline.process.assert_not_called()


def test_document_processing_is_limited_to_configured_concurrency(
    tmp_path: Path,
):
    active = 0
    maximum_active = 0
    active_lock = threading.Lock()

    concurrency_limit = settings.max_concurrent_document_processing

    class TrackingContext:
        def __init__(self):
            self.gate = threading.BoundedSemaphore(concurrency_limit)

        def __enter__(self):
            nonlocal active, maximum_active
            self.gate.acquire()
            with active_lock:
                active += 1
                maximum_active = max(maximum_active, active)

        def __exit__(self, *_exc_info):
            nonlocal active
            with active_lock:
                active -= 1
            self.gate.release()

    service = UploadService.__new__(UploadService)

    def process(path: Path) -> dict[str, int]:
        assert path.is_file()
        time.sleep(0.05)
        return {"chunk_count": 1, "total_chars": 7}

    service.pipeline = MagicMock()
    service.pipeline.process.side_effect = process

    with (
        patch.object(settings, "upload_dir", tmp_path),
        patch.object(upload_service_module, "_document_processing_slots", TrackingContext()),
        patch("app.rag.retriever.Retriever.invalidate_corpus_cache"),
    ):
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(
                executor.map(
                    lambda index: service.process_upload_stream(
                        BytesIO(f"content-{index}".encode()), f"doc-{index}.txt"
                    ),
                    range(8),
                )
            )

    assert maximum_active == concurrency_limit
    assert len(results) == 8
    assert all(result["status"] == "ready" for result in results)


@pytest.mark.parametrize(
    ("quota_setting", "quota_limit", "expected_status"),
    [
        ("max_document_count", 1, 429),
        ("max_total_storage_mb", 1, 413),
    ],
)
def test_upload_quotas_reject_without_processing_or_leaving_partial_data(
    tmp_path: Path,
    quota_setting: str,
    quota_limit: int,
    expected_status: int,
):
    existing = tmp_path / "12345678-ab1"
    existing.mkdir()
    (existing / "document_info.json").write_text(
        json.dumps({"document_id": existing.name, "filename": "existing.bin"}),
        encoding="utf-8",
    )
    (existing / "original.bin").write_bytes(
        b"x" * (1024 * 1024) if quota_setting == "max_total_storage_mb" else b"x"
    )
    service = UploadService.__new__(UploadService)
    service.pipeline = MagicMock()
    patches = [
        patch.object(settings, "upload_dir", tmp_path),
        patch.object(settings, quota_setting, quota_limit),
    ]

    with patches[0], patches[1]:
        with pytest.raises(UploadQuotaExceededError) as error:
            service.process_upload_stream(BytesIO(b"new"), "new.txt")

    assert error.value.status_code == expected_status
    assert "quota" in error.value.detail.lower()
    assert list(tmp_path.iterdir()) == [existing]
    service.pipeline.process.assert_not_called()


def test_document_list_cache_is_invalidated_by_metadata_updates(tmp_path: Path):
    document_dir = tmp_path / "12345678-ab1"
    document_dir.mkdir()
    (document_dir / "document_info.json").write_text(
        json.dumps({"document_id": document_dir.name, "filename": "old.txt"}),
        encoding="utf-8",
    )
    service = UploadService.__new__(UploadService)

    with patch.object(settings, "upload_dir", tmp_path):
        assert service.list_documents()[0]["filename"] == "old.txt"
        assert service.save_document(
            document_dir.name,
            {"document_id": document_dir.name, "filename": "new.txt"},
        )
        assert service.list_documents()[0]["filename"] == "new.txt"


def test_document_path_helper_rejects_symlinks_escaping_upload_root(tmp_path: Path):
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "important.txt").write_text("preserve")
    link = upload_root / "12345678-abc"
    link.symlink_to(outside, target_is_directory=True)

    with patch.object(settings, "upload_dir", upload_root):
        with pytest.raises(ValueError, match="Invalid document path"):
            resolve_document_dir("12345678-abc")

    assert (outside / "important.txt").read_text() == "preserve"


@pytest.mark.parametrize(
    "document_id",
    ["..", "%2e%2e", "conversations", "collections"],
)
def test_document_path_helper_rejects_invalid_ids(document_id: str, tmp_path: Path):
    with patch.object(settings, "upload_dir", tmp_path):
        with pytest.raises(ValueError, match="Invalid document ID"):
            resolve_document_dir(document_id)


def test_reconciliation_marks_interrupted_uploads_failed(tmp_path: Path):
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "original.txt").write_text("content")
    (document_dir / "document_info.json").write_text(
        json.dumps({
            "document_id": document_dir.name,
            "filename": "original.txt",
            "chunk_count": 0,
            "status": "processing",
        }),
        encoding="utf-8",
    )

    with patch.object(settings, "upload_dir", tmp_path):
        UploadService.reconcile_documents()

    info = json.loads((document_dir / "document_info.json").read_text())
    assert info["status"] == "failed"
    assert "complete searchable index" in info["error"]


@pytest.mark.parametrize(
    "payload",
    ["[1, 2, 3]", '"text"', "42", "null"],
    ids=["list-root", "str-root", "int-root", "null-root"],
)
def test_reconciliation_marks_non_object_metadata_failed(
    payload: str, tmp_path: Path
):
    """A non-object JSON root must be marked failed, not crash reconciliation.

    Regression: a valid-JSON non-dictionary root (e.g. ``[1, 2, 3]``) used to
    reach ``info.get("status")`` in ``reconcile_documents`` and raise
    ``AttributeError``. It is now classified as corrupt metadata (the same
    handling as malformed JSON) and marked failed with an actionable error.
    """
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "document_info.json").write_text(payload, encoding="utf-8")

    with patch.object(settings, "upload_dir", tmp_path):
        UploadService.reconcile_documents()

    info = json.loads((document_dir / "document_info.json").read_text())
    assert info["status"] == "failed"
    assert "missing or corrupt" in info["error"]


def test_reconciliation_marks_malformed_metadata_failed(tmp_path: Path):
    """Malformed JSON is marked failed (unchanged behaviour, regression guard)."""
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "document_info.json").write_text("{not json", encoding="utf-8")

    with patch.object(settings, "upload_dir", tmp_path):
        UploadService.reconcile_documents()

    info = json.loads((document_dir / "document_info.json").read_text())
    assert info["status"] == "failed"
    assert "missing or corrupt" in info["error"]


def test_reconciliation_continues_past_invalid_document(tmp_path: Path):
    """A single bad document must not stop reconciliation of the others."""
    bad = tmp_path / "12345678-aaa"
    bad.mkdir()
    (bad / "document_info.json").write_text("[1, 2, 3]", encoding="utf-8")

    # A valid interrupted upload: reconciliation should still mark it failed
    # even though another document's metadata is corrupt.
    good = tmp_path / "12345678-bbb"
    good.mkdir()
    (good / "original.txt").write_text("content")
    (good / "document_info.json").write_text(
        json.dumps({
            "document_id": good.name,
            "filename": "original.txt",
            "chunk_count": 0,
            "status": "processing",
        }),
        encoding="utf-8",
    )

    with patch.object(settings, "upload_dir", tmp_path):
        UploadService.reconcile_documents()  # must not raise

    bad_info = json.loads((bad / "document_info.json").read_text())
    assert bad_info["status"] == "failed"
    assert "missing or corrupt" in bad_info["error"]

    good_info = json.loads((good / "document_info.json").read_text())
    assert good_info["status"] == "failed"
    assert "complete searchable index" in good_info["error"]


def test_ready_document_requires_matching_chunks_and_index(tmp_path: Path):
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "chunks.json").write_text(json.dumps([{"content": "one"}]))
    (document_dir / "document_info.json").write_text(
        json.dumps({
            "document_id": document_dir.name,
            "filename": "original.txt",
            "chunk_count": 1,
            "status": "ready",
        }),
        encoding="utf-8",
    )
    store = UploadService.__new__(UploadService)

    with patch.object(settings, "upload_dir", tmp_path):
        status_without_index = store.get_document_status(document_dir.name)
        # 384-dim so the index is embedding-compatible with the active config;
        # this test targets chunk/index count consistency.
        VectorStore.save(
            np.zeros((1, settings.embedding_dim), dtype=np.float32), document_dir
        )
        status_with_index = store.get_document_status(document_dir.name)

    assert status_without_index is not None
    assert status_without_index["status"] == "failed"
    assert status_with_index is not None
    assert status_with_index["status"] == "ready"


def test_upload_persists_embedding_provenance(tmp_path: Path):
    service = UploadService.__new__(UploadService)
    service.pipeline = MagicMock()
    service.pipeline.process.return_value = {
        "chunk_count": 1,
        "total_chars": 7,
        "processing_time": 0.01,
        "embedding_model": "acme/indexing-model",
        "embedding_revision": "rev-x",
        "embedding_dim": 384,
    }

    with (
        patch.object(settings, "upload_dir", tmp_path),
        patch("app.rag.retriever.Retriever.invalidate_corpus_cache"),
    ):
        result = service.process_upload_stream(BytesIO(b"content"), "doc.txt")

    assert result["embedding_model"] == "acme/indexing-model"
    assert result["embedding_revision"] == "rev-x"
    assert result["embedding_dim"] == 384

    stored = json.loads(
        (tmp_path / result["document_id"] / "document_info.json").read_text(
            encoding="utf-8"
        )
    )
    assert stored["embedding_model"] == "acme/indexing-model"
    assert stored["embedding_revision"] == "rev-x"
    assert stored["embedding_dim"] == 384


def test_upload_without_provenance_result_stays_working(tmp_path: Path):
    """A pipeline result without provenance keys must not break the upload."""
    service = UploadService.__new__(UploadService)
    service.pipeline = MagicMock()
    service.pipeline.process.return_value = {"chunk_count": 1, "total_chars": 7}

    with (
        patch.object(settings, "upload_dir", tmp_path),
        patch("app.rag.retriever.Retriever.invalidate_corpus_cache"),
    ):
        result = service.process_upload_stream(BytesIO(b"content"), "doc.txt")

    assert result["status"] == "ready"
    stored = json.loads(
        (tmp_path / result["document_id"] / "document_info.json").read_text(
            encoding="utf-8"
        )
    )
    assert "embedding_model" not in stored


def test_status_reports_incompatible_index_without_touching_files(tmp_path: Path):
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "chunks.json").write_text(json.dumps([{"content": "one"}]))
    info = {
        "document_id": document_dir.name,
        "filename": "original.txt",
        "chunk_count": 1,
        "status": "ready",
        "embedding_model": "acme/other-model",
        "embedding_revision": None,
        "embedding_dim": 2,
    }
    (document_dir / "document_info.json").write_text(json.dumps(info), encoding="utf-8")
    VectorStore.save(np.array([[1.0, 0.0]], dtype=np.float32), document_dir)
    store = UploadService.__new__(UploadService)

    with patch.object(settings, "upload_dir", tmp_path):
        status = store.get_document_status(document_dir.name)

    assert status is not None
    assert status["status"] == "failed"
    assert "2-dimensional" in status["error"]
    assert "re-upload" in status["error"]

    # Compatibility failure must never modify stored data.
    stored = json.loads((document_dir / "document_info.json").read_text())
    assert stored == info
    assert (document_dir / "faiss.index").is_file()
    assert (document_dir / "chunks.json").is_file()


def test_status_accepts_legacy_index_with_matching_dimension(tmp_path: Path):
    """Legacy (provenance-free) documents stay usable under the legacy policy."""
    document_dir = tmp_path / "12345678-def"
    document_dir.mkdir()
    (document_dir / "chunks.json").write_text(json.dumps([{"content": "one"}]))
    (document_dir / "document_info.json").write_text(
        json.dumps({
            "document_id": document_dir.name,
            "filename": "original.txt",
            "chunk_count": 1,
            "status": "ready",
        }),
        encoding="utf-8",
    )
    VectorStore.save(
        np.zeros((1, settings.embedding_dim), dtype=np.float32), document_dir
    )
    store = UploadService.__new__(UploadService)

    with patch.object(settings, "upload_dir", tmp_path):
        status = store.get_document_status(document_dir.name)

    assert status is not None
    assert status["status"] == "ready"
    assert status["error"] is None


@pytest.mark.parametrize(
    "payload",
    ["[1, 2, 3]", '"text"', "42", "null"],
    ids=["list-root", "str-root", "int-root", "null-root"],
)
def test_status_with_non_object_metadata_returns_not_found(
    payload: str, tmp_path: Path
):
    """A non-object JSON root must be reported as not found, not crash.

    Regression: a valid-JSON non-dictionary root (e.g. ``[1, 2, 3]``) used to
    reach ``info.get("status")`` in ``get_document_status`` and raise
    ``AttributeError``. It is now treated like missing/malformed metadata and
    reported as not found rather than healthy or ready.
    """
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "document_info.json").write_text(payload, encoding="utf-8")
    store = UploadService.__new__(UploadService)

    with patch.object(settings, "upload_dir", tmp_path):
        assert store.get_document_status(document_dir.name) is None


def test_status_with_malformed_metadata_returns_not_found(tmp_path: Path):
    """Malformed JSON reports not found (unchanged behaviour, regression guard)."""
    document_dir = tmp_path / "12345678-abc"
    document_dir.mkdir()
    (document_dir / "document_info.json").write_text("{not json", encoding="utf-8")
    store = UploadService.__new__(UploadService)

    with patch.object(settings, "upload_dir", tmp_path):
        assert store.get_document_status(document_dir.name) is None


def test_document_pipeline_rejects_zero_chunk_documents(tmp_path: Path):
    pipeline = DocumentPipeline.__new__(DocumentPipeline)
    pipeline.loader = MagicMock()
    pipeline.loader.extract_markdown.return_value = "valid text"
    pipeline.chunker = MagicMock()
    pipeline.chunker.split.return_value = []

    with pytest.raises(ValueError, match="No text chunks"):
        pipeline.process(tmp_path / "12345678-abc" / "original.txt")
