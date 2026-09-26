import logging
import re
import time
import uuid
from collections import Counter, defaultdict
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.api.router import api_router
from app.config.settings import settings
from app.exceptions import LLMError
from app.middleware import APIKeyMiddleware, RequestBodyLimitMiddleware
from app.observability import JSONLogFormatter, RequestIDFilter, request_id_context
from app.services.upload_service import UploadService

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s | %(levelname)-8s | %(request_id)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
for handler in logging.getLogger().handlers:
    handler.addFilter(RequestIDFilter())
    if settings.environment.lower() == "production":
        handler.setFormatter(JSONLogFormatter())

logger = logging.getLogger(__name__)
_request_count: Counter[tuple[str, str, int]] = Counter()
_request_duration_count: Counter[tuple[str, str]] = Counter()
_request_duration_sum: defaultdict[tuple[str, str], float] = defaultdict(float)
_metrics_lock = Lock()

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
    supplied_id = request.headers.get("X-Request-ID", "")
    request_id = (
        supplied_id
        if re.fullmatch(r"[A-Za-z0-9._-]{1,64}", supplied_id)
        else uuid.uuid4().hex[:8]
    )
    request.state.request_id = request_id
    context_token = request_id_context.set(request_id)
    start = time.perf_counter()

    try:
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{elapsed:.0f}ms"

        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        metric_key = (request.method, route_path)
        with _metrics_lock:
            _request_count[(request.method, route_path, response.status_code)] += 1
            _request_duration_count[metric_key] += 1
            _request_duration_sum[metric_key] += elapsed

        logger.info(
            "[%s] %s %s -> %d (%.0fms)",
            request_id,
            request.method,
            route_path,
            response.status_code,
            elapsed,
        )
        return response
    finally:
        request_id_context.reset(context_token)


@app.get("/metrics", include_in_schema=False)
def metrics() -> PlainTextResponse:
    lines = [
        "# HELP http_requests_total Total HTTP requests by method, route, and status.",
        "# TYPE http_requests_total counter",
    ]

    def escape_label(value: str) -> str:
        return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

    with _metrics_lock:
        counts = sorted(_request_count.items())
        durations = sorted(_request_duration_count.items())
        duration_sums = dict(_request_duration_sum)

    for (method, route, status), count in counts:
        lines.append(
            f'http_requests_total{{method="{escape_label(method)}",'
            f'route="{escape_label(route)}",status="{status}"}} {count}'
        )
    lines.extend([
        "# HELP http_request_duration_milliseconds HTTP request duration.",
        "# TYPE http_request_duration_milliseconds summary",
    ])
    for (method, route), count in durations:
        labels = f'method="{escape_label(method)}",route="{escape_label(route)}"'
        lines.append(f"http_request_duration_milliseconds_count{{{labels}}} {count}")
        lines.append(
            f"http_request_duration_milliseconds_sum{{{labels}}} "
            f"{duration_sums[(method, route)]:.3f}"
        )
    return PlainTextResponse("\n".join(lines) + "\n")


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
    UploadService.reconcile_documents()
    logger.info("Reconciled document processing state at startup.")


@app.get("/")
def root() -> dict[str, str | None]:
    return {
        "name": "DocuChat RAG API",
        "version": "3.1.0",
        "docs": None if is_production else "/docs",
    }
