from fastapi import APIRouter

from app.config.settings import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict:
    available_models = settings.get_available_ollama_models()
    model_resolved = settings.resolve_model()

    return {
        "status": "healthy",
        "version": "2.0.0",
        "upload_dir": str(settings.upload_dir),
        "model_configured": settings.ollama_model,
        "model_active": model_resolved,
        "embedding_model": settings.embedding_model,
        "ollama_reachable": len(available_models) > 0,
        "available_models": available_models,
    }
