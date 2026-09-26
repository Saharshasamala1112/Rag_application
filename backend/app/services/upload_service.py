from __future__ import annotations

import json
import logging
import re
import shutil
import time
from io import BytesIO
from pathlib import Path
from typing import BinaryIO

from app.config.settings import settings
from app.rag.pipeline import DocumentPipeline

logger = logging.getLogger(__name__)
DOCUMENT_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{3}$")


class UploadTooLargeError(ValueError):
    pass


def resolve_document_dir(document_id: str) -> Path:
    """Resolve a valid document ID to a direct child of the upload directory."""
    if not DOCUMENT_ID_PATTERN.fullmatch(document_id):
        raise ValueError("Invalid document ID.")

    upload_root = settings.upload_dir.resolve()
    candidate = upload_root / document_id
    if candidate.is_symlink():
        raise ValueError("Invalid document path.")
    document_dir = candidate.resolve()
    if document_dir.parent != upload_root:
        raise ValueError("Invalid document path.")
    return document_dir


class UploadService:
    """Handle document uploads and management."""

    def __init__(self) -> None:
        self.pipeline = DocumentPipeline()

    def _save_document_info(self, doc_dir: Path, info: dict) -> None:
        """Save document metadata."""
        info_file = doc_dir / "document_info.json"
        info_file.write_text(
            json.dumps(info, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def process_upload(
        self,
        file_content: bytes,
        filename: str,
    ) -> dict:
        """Process an uploaded file and return document info."""
        return self.process_upload_stream(BytesIO(file_content), filename)

    def process_upload_stream(
        self,
        file_stream: BinaryIO,
        filename: str,
        max_size: int | None = None,
    ) -> dict:
        """Persist an upload in bounded chunks before processing it."""

        import uuid

        document_id = str(uuid.uuid4())[:12]
        output_dir = resolve_document_dir(document_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(filename).suffix.lower() or ".bin"
        file_path = output_dir / f"original{ext}"
        try:
            file_stream.seek(0)
            file_size = 0
            with file_path.open("wb") as destination:
                while chunk := file_stream.read(64 * 1024):
                    file_size += len(chunk)
                    if max_size is not None and file_size > max_size:
                        raise UploadTooLargeError(
                            f"File too large. Maximum size is {max_size} bytes."
                        )
                    destination.write(chunk)

            if file_size == 0:
                raise ValueError("File is empty.")

            result = self.pipeline.process(file_path)
        except Exception:
            try:
                shutil.rmtree(output_dir)
            except OSError as cleanup_error:
                logger.exception(
                    "Failed to clean up incomplete upload %s: %s",
                    document_id,
                    cleanup_error,
                )
            raise

        doc_info = {
            "document_id": document_id,
            "filename": filename,
            "file_type": ext,
            "chunk_count": result["chunk_count"],
            "total_chars": result["total_chars"],
            "file_size": file_size,
            "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        self._save_document_info(output_dir, doc_info)

        return doc_info

    def list_documents(self) -> list[dict]:
        """List all uploaded documents."""
        documents = []

        if not settings.upload_dir.exists():
            return documents

        for child in sorted(settings.upload_dir.iterdir(), reverse=True):
            if not child.is_dir():
                continue

            try:
                info_file = resolve_document_dir(child.name) / "document_info.json"
            except ValueError:
                continue
            if info_file.exists():
                try:
                    info = json.loads(info_file.read_text(encoding="utf-8"))
                    documents.append(info)
                except (json.JSONDecodeError, OSError):
                    continue

        return documents

    def get_document(self, document_id: str) -> dict | None:
        """Get document info by ID."""
        try:
            info_file = resolve_document_dir(document_id) / "document_info.json"
        except ValueError:
            return None
        if not info_file.exists():
            return None

        try:
            return json.loads(info_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    def save_document(self, document_id: str, data: dict) -> bool:
        """Save document info."""
        try:
            doc_dir = resolve_document_dir(document_id)
        except ValueError:
            return False
        if not doc_dir.exists():
            return False

        info_file = doc_dir / "document_info.json"
        try:
            info_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            return True
        except OSError as e:
            logger.error("Failed to save document %s: %s", document_id, e)
            return False

    def delete_document(self, document_id: str) -> bool:
        """Delete a document and its data."""
        try:
            doc_dir = resolve_document_dir(document_id)
        except ValueError:
            return False
        if not doc_dir.exists():
            return False

        try:
            shutil.rmtree(doc_dir)
        except OSError as e:
            logger.error("Failed to delete document %s: %s", document_id, e)
            return False

        return True

    def get_document_chunks_path(self, document_id: str) -> Path | None:
        """Return path to chunks.json if it exists, else None."""
        try:
            chunks_file = resolve_document_dir(document_id) / "chunks.json"
        except ValueError:
            return None
        return chunks_file if chunks_file.exists() else None

    def get_document_preview(self, document_id: str, max_chars: int = 2000) -> str | None:
        """Get a text preview of the document."""
        chunks_file = self.get_document_chunks_path(document_id)
        if chunks_file is None:
            return None

        try:
            chunks = json.loads(chunks_file.read_text(encoding="utf-8"))
            preview = "\n\n".join(c["content"] for c in chunks[:5])
            return preview[:max_chars]
        except (json.JSONDecodeError, OSError):
            return None
