import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.config.settings import settings
from app.exceptions import LLMError
from app.middleware import APIKeyMiddleware, RequestBodyLimitMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)

is_production = settings.environment.lower() == "production"

app = FastAPI(
    title="DocuChat RAG API",
    description="Production RAG with hybrid search, reranking, and streaming",
    version="3.1.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.add_middleware(
    RequestBodyLimitMiddleware,
    max_body_size=settings.max_file_size_mb * 1024 * 1024 + 1024 * 1024,
)
app.add_middleware(APIKeyMiddleware, get_api_key=lambda: settings.api_key)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID and timing to every request."""
    request_id = uuid.uuid4().hex[:8]
    request.state.request_id = request_id
    start = time.perf_counter()

    response = await call_next(request)

    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{elapsed:.0f}ms"

    logger.info(
        "[%s] %s %s -> %d (%.0fms)",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(LLMError)
async def llm_error_handler(_request: Request, exc: LLMError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc), "type": "llm_error"},
    )


@app.exception_handler(Exception)
async def global_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "type": "server_error"},
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
def root() -> dict[str, str | None]:
    return {
        "name": "DocuChat RAG API",
        "version": "3.1.0",
        "docs": None if is_production else "/docs",
    }
