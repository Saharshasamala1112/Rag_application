from __future__ import annotations

import logging

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate embeddings using a Sentence Transformer model."""

    _instance: EmbeddingService | None = None

    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
    ) -> None:
        self.model = SentenceTransformer(model_name)
        logger.info("Embedding model loaded: %s", model_name)

    @classmethod
    def get_instance(cls) -> EmbeddingService:
        """Singleton accessor to avoid reloading the model."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def encode(
        self,
        texts: list[str],
    ) -> np.ndarray:
        """Generate normalized embeddings."""

        if not texts:
            return np.empty((0, 384), dtype=np.float32)

        embeddings = self.model.encode(
            texts,
            batch_size=128,
            show_progress_bar=len(texts) > 50,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        return embeddings.astype(np.float32)
