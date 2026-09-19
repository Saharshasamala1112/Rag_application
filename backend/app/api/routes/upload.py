from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config.settings import settings
from app.services.upload_service import UploadService

router = APIRouter(tags=["Upload"])

upload_service = UploadService()


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
) -> dict:
    """Upload and process a PDF document."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()

    max_size = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB.",
        )

    try:
        doc_info = upload_service.process_upload(
            file_content=content,
            filename=file.filename,
        )
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
