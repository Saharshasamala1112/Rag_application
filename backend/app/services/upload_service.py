from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from app.config.settings import settings
from app.rag.pipeline import DocumentPipeline

logger = logging.getLogger(__name__)


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

        import uuid

        document_id = str(uuid.uuid4())[:12]
        output_dir = settings.upload_dir / document_id
        output_dir.mkdir(parents=True, exist_ok=True)

        # Preserve original file extension
        ext = Path(filename).suffix.lower() or ".bin"
        file_path = output_dir / f"original{ext}"
        file_path.write_bytes(file_content)

        try:
            result = self.pipeline.process(file_path)
        except Exception:
            # Clean up on pipeline failure
            import shutil

            try:
                shutil.rmtree(output_dir)
            except OSError:
                pass
            raise

        doc_info = {
            "document_id": document_id,
            "filename": filename,
            "file_type": ext,
            "chunk_count": result["chunk_count"],
            "total_chars": result["total_chars"],
            "file_size": len(file_content),
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

            info_file = child / "document_info.json"
            if info_file.exists():
                try:
                    info = json.loads(info_file.read_text(encoding="utf-8"))
                    documents.append(info)
                except (json.JSONDecodeError, OSError):
                    continue

        return documents

    def get_document(self, document_id: str) -> dict | None:
        """Get document info by ID."""
        info_file = settings.upload_dir / document_id / "document_info.json"
        if not info_file.exists():
            return None

        try:
            return json.loads(info_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    def save_document(self, document_id: str, data: dict) -> bool:
        """Save document info."""
        doc_dir = settings.upload_dir / document_id
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
        import shutil

        doc_dir = settings.upload_dir / document_id
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
        chunks_file = settings.upload_dir / document_id / "chunks.json"
        return chunks_file if chunks_file.exists() else None

    def get_document_preview(self, document_id: str, max_chars: int = 2000) -> str | None:
        """Get a text preview of the document."""
        doc_dir = settings.upload_dir / document_id
        chunks_file = doc_dir / "chunks.json"

        if not chunks_file.exists():
            return None

        try:
            chunks = json.loads(chunks_file.read_text(encoding="utf-8"))
            preview = "\n\n".join(c["content"] for c in chunks[:5])
            return preview[:max_chars]
        except (json.JSONDecodeError, OSError):
            return None
