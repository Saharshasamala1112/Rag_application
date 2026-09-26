"""Document management routes."""

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.models.document import DocumentChunk
from app.models.response import (
    DocumentChunksResponse,
    DocumentDeleteResponse,
    DocumentInfo,
    DocumentListResponse,
    DocumentPreviewResponse,
    DocumentStatusResponse,
)
from app.services.upload_service import UploadService

router = APIRouter(tags=["Documents"])

upload_service = UploadService()


class DocumentUpdate(BaseModel):
    filename: str | None = Field(default=None, min_length=1, max_length=255)

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, filename: str | None) -> str | None:
        if filename is None:
            return None
        normalized = filename.strip()
        if (
            not normalized
            or normalized in {".", ".."}
            or "/" in normalized
            or "\\" in normalized
            or any(ord(character) < 32 or ord(character) == 127 for character in normalized)
        ):
            raise ValueError("Filename must be a plain display name.")
        return normalized


@router.get("/documents")
def list_documents() -> DocumentListResponse:
    documents = upload_service.list_documents()
    return DocumentListResponse(
        documents=[DocumentInfo(**d) for d in documents],
        total=len(documents),
    )


@router.get("/documents/{document_id}", response_model=DocumentInfo)
def get_document(document_id: str) -> DocumentInfo:
    doc = upload_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentInfo(**doc)


@router.patch("/documents/{document_id}", response_model=DocumentInfo)
def update_document(document_id: str, body: DocumentUpdate) -> DocumentInfo:
    doc = upload_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if body.filename is not None:
        doc["filename"] = body.filename
        upload_service.save_document(document_id, doc)
    return DocumentInfo(**doc)


@router.get(
    "/documents/{document_id}/status", response_model=DocumentStatusResponse
)
def get_document_status(document_id: str) -> DocumentStatusResponse:
    """Get document processing status."""
    status = upload_service.get_document_status(document_id)
    if not status:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentStatusResponse(**status)


@router.delete("/documents/{document_id}", response_model=DocumentDeleteResponse)
def delete_document(document_id: str) -> DocumentDeleteResponse:
    deleted = upload_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentDeleteResponse(message="Document deleted.", document_id=document_id)


@router.get("/documents/{document_id}/preview", response_model=DocumentPreviewResponse)
def document_preview(document_id: str) -> DocumentPreviewResponse:
    preview = upload_service.get_document_preview(document_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentPreviewResponse(document_id=document_id, preview=preview)


@router.get("/documents/{document_id}/chunks", response_model=DocumentChunksResponse)
def document_chunks(document_id: str) -> DocumentChunksResponse:
    """Return all chunks for a document."""
    chunks_path = upload_service.get_document_chunks_path(document_id)
    if chunks_path is None:
        raise HTTPException(status_code=404, detail="Document not found or no chunks.")

    try:
        chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        raise HTTPException(status_code=500, detail="Failed to read chunks.") from error

    return DocumentChunksResponse(
        document_id=document_id,
        chunks=[DocumentChunk(**chunk) for chunk in chunks],
        total=len(chunks),
    )
