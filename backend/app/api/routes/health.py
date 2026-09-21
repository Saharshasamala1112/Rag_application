"""Health check endpoint."""

from fastapi import APIRouter

from app.config.settings import settings
from app.models.response import HealthResponse
from app.services.upload_service import UploadService

router = APIRouter(tags=["Health"])

upload_service = UploadService()


@router.get("/health")
def health() -> HealthResponse:
    available_models = settings.get_available_ollama_models()
    model_resolved = settings.resolve_model()
    doc_count = len(upload_service.list_documents())

    return HealthResponse(
        status="healthy",
        version="3.1.0",
        model=model_resolved,
        embedding_model=settings.embedding_model,
        ollama_available=len(available_models) > 0,
        document_count=doc_count,
    )
