"""Custom exceptions for the RAG application."""


class LLMError(Exception):
    """Raised when the LLM fails to generate a response."""


class DocumentNotFoundError(Exception):
    """Raised when a requested document does not exist."""


class PipelineError(Exception):
    """Raised when document processing fails."""
