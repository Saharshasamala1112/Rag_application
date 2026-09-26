"""Custom exceptions for the RAG application."""


class LLMError(Exception):
    """Raised when the LLM fails to generate a response.

    Caught in ``app.api.routes.query`` (HTTP 503) and inside
    ``QueryService.query_stream`` (SSE ``error`` event), so it never reaches
    the app-level exception handlers. See issue #48.
    """
