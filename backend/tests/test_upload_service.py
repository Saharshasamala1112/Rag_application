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
        VectorStore.save(np.array([[1.0, 0.0]], dtype=np.float32), document_dir)
        status_with_index = store.get_document_status(document_dir.name)

    assert status_without_index is not None
    assert status_without_index["status"] == "failed"
    assert status_with_index is not None
    assert status_with_index["status"] == "ready"


def test_document_pipeline_rejects_zero_chunk_documents(tmp_path: Path):
    pipeline = DocumentPipeline.__new__(DocumentPipeline)
    pipeline.loader = MagicMock()
    pipeline.loader.extract_markdown.return_value = "valid text"
    pipeline.chunker = MagicMock()
    pipeline.chunker.split.return_value = []

    with pytest.raises(ValueError, match="No text chunks"):
        pipeline.process(tmp_path / "12345678-abc" / "original.txt")
