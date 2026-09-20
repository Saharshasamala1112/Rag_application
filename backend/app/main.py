import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.config.settings import settings
from app.exceptions import LLMError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="High-End RAG Backend",
    description="Advanced RAG with hybrid search, reranking, and streaming",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(LLMError)
async def llm_error_handler(_request: Request, exc: LLMError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def global_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )


@app.on_event("startup")
def on_startup() -> None:
    available = settings.get_available_ollama_models()
    if available:
        logger.info("Ollama models available: %s", ", ".join(available))
        resolved = settings.resolve_model()
        logger.info("Using model: %s", resolved)
    else:
        logger.warning("Ollama is unreachable or has no models. LLM queries will fail.")


@app.get("/")
def root() -> dict:
    return {"name": "High-End RAG API", "version": "2.0.0", "docs": "/docs"}
