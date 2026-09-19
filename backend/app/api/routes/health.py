from fastapi import APIRouter

from app.config.settings import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "healthy",
        "version": "2.0.0",
        "upload_dir": str(settings.upload_dir),
        "model": settings.ollama_model,
        "embedding_model": settings.embedding_model,
    }
