"""Health check endpoint."""

from fastapi import APIRouter, HTTPException

from app.config.settings import settings
from app.models.response import HealthLiveResponse, HealthResponse
from app.rag.embeddings import EmbeddingService
from app.services.upload_service import UploadService

router = APIRouter(tags=["Health"])

upload_service = UploadService()


def readiness() -> HealthResponse:
    available_models = settings.get_available_ollama_models()
    model_resolved = settings.resolve_model()
    documents = upload_service.list_documents()
    indexes_ready = all(
        (status := upload_service.get_document_status(document["document_id"]))
        is not None
        and status["status"] == "ready"
        for document in documents
        if document.get("status", "ready") == "ready"
    )
    # Report the model the embedding service actually loaded; fall back to the
    # configured value only while the model is still unloaded (BE-01). Reading
    # the singleton never triggers a model load.
    loaded_embedding = EmbeddingService.peek_instance()

    response = HealthResponse(
        status="healthy" if available_models and indexes_ready else "degraded",
        version="3.1.0",
        model=model_resolved,
        embedding_model=(
            loaded_embedding.model_name
            if loaded_embedding is not None
            else settings.embedding_model
        ),
        ollama_available=len(available_models) > 0,
        document_count=len(documents),
    )
    if not available_models or not indexes_ready:
        raise HTTPException(status_code=503, detail=response.model_dump())
    return response


@router.get("/health/live", response_model=HealthLiveResponse)
def health_live() -> HealthLiveResponse:
    return HealthLiveResponse()


@router.get("/health/ready")
def health_ready() -> HealthResponse:
    return readiness()


@router.get("/health")
def health() -> HealthResponse:
    return readiness()
