from fastapi import APIRouter, HTTPException

from app.services.upload_service import UploadService

router = APIRouter(tags=["Documents"])

upload_service = UploadService()


@router.get("/documents")
def list_documents() -> dict:
    """List all uploaded documents."""
    documents = upload_service.list_documents()
    return {
        "documents": documents,
        "total": len(documents),
    }


@router.get("/documents/{document_id}")
def get_document(document_id: str) -> dict:
    """Get document details."""
    doc = upload_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.delete("/documents/{document_id}")
def delete_document(document_id: str) -> dict:
    """Delete a document."""
    deleted = upload_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted.", "document_id": document_id}


@router.get("/documents/{document_id}/preview")
def document_preview(document_id: str) -> dict:
    """Get document text preview."""
    preview = upload_service.get_document_preview(document_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"document_id": document_id, "preview": preview}
