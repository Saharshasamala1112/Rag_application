from __future__ import annotations

import json
import logging
import os
import re
import shutil
import tempfile
import time
from io import BytesIO
from pathlib import Path
from typing import BinaryIO

from app.config.settings import settings
from app.rag.pipeline import DocumentPipeline
from app.rag.vector_store import VectorStore

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

    @staticmethod
    def _save_document_info(doc_dir: Path, info: dict) -> None:
        """Save document metadata."""
        info_file = doc_dir / "document_info.json"
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=doc_dir,
                prefix=".document-info-",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                json.dump(info, temporary_file, indent=2, ensure_ascii=False)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_path, info_file)
        except Exception:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise

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
        file_size = 0
        document_info = {
            "document_id": document_id,
            "filename": filename,
            "file_type": ext,
            "chunk_count": 0,
            "total_chars": 0,
            "file_size": 0,
            "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "uploading",
        }
        self._save_document_info(output_dir, document_info)

        try:
            file_stream.seek(0)
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

            document_info["file_size"] = file_size
            document_info["status"] = "processing"
            self._save_document_info(output_dir, document_info)
            result = self.pipeline.process(file_path)
        except UploadTooLargeError:
            try:
                shutil.rmtree(output_dir)
            except OSError:
                logger.exception("Failed to clean up oversized upload %s.", document_id)
            raise
        except Exception:
            try:
                document_info["status"] = "failed"
                document_info["error"] = (
                    "Processing failed. Check the server logs and upload the document again."
                )
                self._save_document_info(output_dir, document_info)
            except OSError:
                logger.exception("Failed to record failed upload %s.", document_id)
            raise

        doc_info = {
            **document_info,
            "chunk_count": result["chunk_count"],
            "total_chars": result["total_chars"],
            "file_size": file_size,
            "status": "ready",
        }

        from app.rag.retriever import Retriever

        Retriever.invalidate_corpus_cache()
        self._save_document_info(output_dir, doc_info)

        return doc_info

    @staticmethod
    def reconcile_documents() -> None:
        """Mark interrupted and inconsistent document processing as failed."""
        if not settings.upload_dir.exists():
            return

        for child in settings.upload_dir.iterdir():
            if not child.is_dir():
                continue
            try:
                document_dir = resolve_document_dir(child.name)
            except ValueError:
                continue

            info_file = document_dir / "document_info.json"
            try:
                info = json.loads(info_file.read_text(encoding="utf-8"))
            except FileNotFoundError:
                originals = list(document_dir.glob("original.*"))
                if not originals and not (
                    (document_dir / "chunks.json").exists()
                    or (document_dir / "faiss.index").exists()
                ):
                    continue
                info = {
                    "document_id": child.name,
                    "filename": originals[0].name if originals else "unknown",
                    "file_type": originals[0].suffix if originals else "",
                    "chunk_count": 0,
                    "total_chars": 0,
                    "file_size": originals[0].stat().st_size if originals else 0,
                    "uploaded_at": "",
                    "status": "failed",
                    "error": "Upload was interrupted before processing completed.",
                }
                UploadService._save_document_info(document_dir, info)
                continue
            except (json.JSONDecodeError, OSError):
                logger.exception("Could not read document metadata in %s.", document_dir)
                info = {
                    "document_id": child.name,
                    "filename": "unknown",
                    "file_type": "",
                    "chunk_count": 0,
                    "total_chars": 0,
                    "file_size": 0,
                    "uploaded_at": "",
                    "status": "failed",
                    "error": "Document metadata is missing or corrupt.",
                }
                UploadService._save_document_info(document_dir, info)
                continue

            if info.get("status") == "failed":
                continue

            try:
                chunks = json.loads(
                    (document_dir / "chunks.json").read_text(encoding="utf-8")
                )
                index = VectorStore.load(document_dir)
                ready = (
                    isinstance(chunks, list)
                    and len(chunks) > 0
                    and index is not None
                    and index.ntotal == len(chunks)
                )
            except (json.JSONDecodeError, OSError):
                ready = False

            if info.get("status") in {"uploading", "processing"} or not ready:
                info["status"] = "failed"
                info["error"] = (
                    "Document processing did not produce a complete searchable index."
                )
                UploadService._save_document_info(document_dir, info)
            elif info.get("status") != "ready":
                info["status"] = "ready"
                UploadService._save_document_info(document_dir, info)

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

        try:
            self._save_document_info(doc_dir, data)
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

        from app.rag.retriever import Retriever

        Retriever.invalidate_corpus_cache()
        return True

    def get_document_status(self, document_id: str) -> dict | None:
        info = self.get_document(document_id)
        if info is None:
            return None

        status = info.get("status", "ready")
        error = info.get("error")
        chunks_file = self.get_document_chunks_path(document_id)
        try:
            doc_dir = resolve_document_dir(document_id)
        except ValueError:
            return None
        index = VectorStore.load(doc_dir)
        try:
            chunks = (
                json.loads(chunks_file.read_text(encoding="utf-8"))
                if chunks_file is not None
                else []
            )
        except (json.JSONDecodeError, OSError):
            chunks = []

        if status == "ready" and (
            chunks_file is None
            or index is None
            or not chunks
            or index.ntotal != len(chunks)
            or index.ntotal != info.get("chunk_count", 0)
            or index.ntotal == 0
        ):
            status = "failed"
            error = "Document does not have a complete searchable index."

        return {
            "document_id": document_id,
            "status": status,
            "chunk_count": info.get("chunk_count", 0),
            "filename": info.get("filename", "unknown"),
            "error": error,
        }

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
