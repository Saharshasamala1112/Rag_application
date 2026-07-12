from fastapi import APIRouter, File, UploadFile

from app.services.upload_service import UploadService

router = APIRouter(tags=["Upload"])

upload_service = UploadService()


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
) -> dict:
    document_id, saved_path = await upload_service.save_pdf(file)

    return {
        "message": "Upload successful.",
        "document_id": document_id,
        "path": str(saved_path),
    }
