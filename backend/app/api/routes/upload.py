from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.config.settings import settings
from app.rag.document_loader import SUPPORTED_EXTENSIONS
from app.services.upload_service import UploadService, UploadTooLargeError

router = APIRouter(tags=["Upload"])

upload_service = UploadService()

ALLOWED_EXTENSIONS = set(SUPPORTED_EXTENSIONS.keys())


class TextUploadRequest(BaseModel):
    content: str
    filename: str


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
) -> dict:
    """Upload and process a document (PDF, TXT, MD, CSV, JSON, HTML, code files)."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        supported = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {supported}",
        )

    max_size = settings.max_file_size_mb * 1024 * 1024
    if file.size is not None and file.size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB.",
        )

    try:
        doc_info = upload_service.process_upload_stream(
            file_stream=file.file,
            filename=file.filename,
            max_size=max_size,
        )
    except UploadTooLargeError:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {e}",
        )

    return {
        "message": "Document uploaded and processed successfully.",
        "document_id": doc_info["document_id"],
        "filename": doc_info["filename"],
        "chunk_count": doc_info["chunk_count"],
    }


@router.post("/upload/text")
def upload_text(request: TextUploadRequest) -> dict:
    """Create a document from typed text content."""

    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content is empty.")

    content = request.content.encode("utf-8")
    max_size = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Text content too large. Maximum size is "
                f"{settings.max_file_size_mb}MB."
            ),
        )

    filename = request.filename or "typed-note.txt"
    if not filename.endswith(".txt"):
        filename += ".txt"

    try:
        doc_info = upload_service.process_upload(
            file_content=content,
            filename=filename,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process text: {e}",
        )

    return {
        "message": "Document created from text.",
        "document_id": doc_info["document_id"],
        "filename": doc_info["filename"],
        "chunk_count": doc_info["chunk_count"],
    }


@router.get("/upload/supported-types")
def supported_types() -> dict:
    """List all supported file types."""
    return {
        "types": [
            {"extension": ext, "description": desc}
            for ext, desc in sorted(SUPPORTED_EXTENSIONS.items())
        ],
        "total": len(SUPPORTED_EXTENSIONS),
    }
