from __future__ import annotations

import logging
import re
import threading
import time
from pathlib import Path

from pydantic import Field, PrivateAttr, SecretStr, model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    cors_allow_credentials: bool = True
    api_key: SecretStr | None = None
    environment: str = Field(default="development", validation_alias="ENV")
    log_level: str = "INFO"

    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:latest"
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 2048

    # Embeddings
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    # Reranker
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_top_k: int = 8
    reranker_min_score: float = 0.15

    # Chunking
    chunk_size: int = 800
    chunk_overlap: int = 150

    # Retrieval
    retrieval_top_k: int = 12
    final_top_k: int = 5
    max_context_tokens: int = 1500

    # Upload
    upload_dir: Path = Path("data/uploads")
    max_file_size_mb: int = 50
    max_pdf_pages: int = 500
    max_docx_xml_mb: int = 20
    max_document_archive_mb: int = 100
    max_tabular_file_mb: int = 10
    max_concurrent_document_processing: int = 4
    external_parser_timeout_seconds: int = 10
    _available_models: list[str] | None = PrivateAttr(default=None)
    _models_checked_at: float = PrivateAttr(default=0.0)
    _models_lock: threading.Lock = PrivateAttr(default_factory=threading.Lock)

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if self.cors_allow_credentials and "*" in self.cors_origins:
            raise ValueError(
                "CORS credentials cannot be enabled with a wildcard origin."
            )
        if self.max_file_size_mb < 1:
            raise ValueError("MAX_FILE_SIZE_MB must be at least 1.")
        if any(
            value < 1
            for value in (
                self.max_pdf_pages,
                self.max_docx_xml_mb,
                self.max_document_archive_mb,
                self.max_tabular_file_mb,
                self.max_concurrent_document_processing,
                self.external_parser_timeout_seconds,
            )
        ):
            raise ValueError("Document parser limits must be at least 1.")
        if self.max_context_tokens < 1:
            raise ValueError("MAX_CONTEXT_TOKENS must be at least 1.")
        if not 0.0 <= self.reranker_min_score <= 1.0:
            raise ValueError("RERANKER_MIN_SCORE must be between 0 and 1.")
        if self.log_level.upper() not in {
            "CRITICAL",
            "ERROR",
            "WARNING",
            "INFO",
            "DEBUG",
            "NOTSET",
        }:
            raise ValueError("LOG_LEVEL must be a valid standard logging level.")
        if not re.fullmatch(r"development|production", self.environment, re.IGNORECASE):
            raise ValueError("ENV must be either 'development' or 'production'.")
        return self

    def get_available_ollama_models(self, force_refresh: bool = False) -> list[str]:
        """Query Ollama for available model names, caching results for 60 seconds."""
        with self._models_lock:
            if (
                not force_refresh
                and self._available_models is not None
                and time.monotonic() - self._models_checked_at < 60
            ):
                return self._available_models.copy()

            try:
                from ollama import Client

                response = Client(host=self.ollama_host).list()
                models = [model.model for model in response.models]
            except Exception as error:
                logger.warning("Could not list Ollama models: %s", error)
                models = []

            self._available_models = models
            self._models_checked_at = time.monotonic()
            return models.copy()

    def resolve_model(self) -> str:
        """Return the configured model if available, else fall back to the first available model."""
        available = self.get_available_ollama_models()
        if not available:
            logger.warning("No Ollama models found. LLM queries will fail.")
            return self.ollama_model

        # Exact match
        if self.ollama_model in available:
            return self.ollama_model

        # Partial match (e.g. config has "llama3.2" but Ollama has "llama3.2:latest")
        for model in available:
            if self.ollama_model in model or model in self.ollama_model:
                logger.info("Model '%s' not found, using '%s' instead.", self.ollama_model, model)
                return model

        # Fallback to first available
        fallback = available[0]
        logger.warning(
            "Model '%s' not found. Available: %s. Falling back to '%s'.",
            self.ollama_model,
            ", ".join(available),
            fallback,
        )
        return fallback


settings = Settings()

settings.upload_dir.mkdir(parents=True, exist_ok=True)
