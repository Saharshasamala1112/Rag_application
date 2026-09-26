from __future__ import annotations

import logging
import threading
from typing import Any

from app.config.settings import settings

logger = logging.getLogger(__name__)


class Reranker:
    """Cross-encoder reranker for improved relevance."""

    def __init__(self) -> None:
        self._model: Any | bool | None = None
        self._model_lock = threading.Lock()

    def _load_model(self):
        """Lazy load the cross-encoder model."""
        with self._model_lock:
            if self._model is not None:
                return

            try:
                from sentence_transformers import CrossEncoder

                self._model = CrossEncoder(settings.reranker_model)
                logger.info("Loaded reranker model: %s", settings.reranker_model)
            except Exception as e:
                logger.warning("Failed to load reranker: %s. Using original scores.", e)
                self._model = False

    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_k: int = settings.reranker_top_k,
    ) -> list[dict]:
        """Rerank chunks using cross-encoder scoring."""

        self._load_model()

        if not self._model or not chunks:
            return chunks[:top_k]

        with self._model_lock:
            if not self._model:
                return chunks[:top_k]
            pairs = [(query, chunk["content"]) for chunk in chunks]
            scores = self._model.predict(pairs)

        for chunk, score in zip(chunks, scores):
            chunk["rerank_score"] = float(score)

        reranked = sorted(chunks, key=lambda x: x.get("rerank_score", 0), reverse=True)

        return reranked[:top_k]
