from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.config.settings import settings
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
