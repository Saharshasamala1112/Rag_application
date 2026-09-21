"""Document management routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.response import DocumentInfo, DocumentListResponse
from app.services.upload_service import UploadService

router = APIRouter(tags=["Documents"])

upload_service = UploadService()


class DocumentUpdate(BaseModel):
    filename: str | None = None


@router.get("/documents")
def list_documents() -> DocumentListResponse:
    documents = upload_service.list_documents()
    return DocumentListResponse(
        documents=[DocumentInfo(**d) for d in documents],
        total=len(documents),
    )


@router.get("/documents/{document_id}")
def get_document(document_id: str) -> dict:
    doc = upload_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.patch("/documents/{document_id}")
def update_document(document_id: str, body: DocumentUpdate) -> dict:
    doc = upload_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if body.filename is not None:
        doc["filename"] = body.filename
        upload_service.save_document(document_id, doc)
    return doc


@router.get("/documents/{document_id}/status")
def get_document_status(document_id: str) -> dict:
    """Get document processing status."""
    doc = upload_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    status = "ready"
    chunks_file = upload_service.get_document_chunks_path(document_id)
    if chunks_file is None:
        status = "failed"
    elif doc.get("chunk_count", 0) == 0:
        status = "parsing"

    return {
        "document_id": document_id,
        "status": status,
        "chunk_count": doc.get("chunk_count", 0),
        "filename": doc.get("filename", "unknown"),
    }


@router.delete("/documents/{document_id}")
def delete_document(document_id: str) -> dict:
    deleted = upload_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted.", "document_id": document_id}


@router.get("/documents/{document_id}/preview")
def document_preview(document_id: str) -> dict:
    preview = upload_service.get_document_preview(document_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"document_id": document_id, "preview": preview}


@router.get("/documents/{document_id}/chunks")
def document_chunks(document_id: str) -> dict:
    """Return all chunks for a document."""
    chunks_path = upload_service.get_document_chunks_path(document_id)
    if chunks_path is None:
        raise HTTPException(status_code=404, detail="Document not found or no chunks.")

    import json

    try:
        chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        raise HTTPException(status_code=500, detail="Failed to read chunks.")

    return {
        "document_id": document_id,
        "chunks": chunks,
        "total": len(chunks),
    }
