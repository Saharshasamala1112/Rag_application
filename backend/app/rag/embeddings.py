from __future__ import annotations

import logging
import threading

import numpy as np

logger = logging.getLogger(__name__)
EMBEDDING_MODEL_REVISION = "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"


class EmbeddingService:
    """Generate embeddings using a Sentence Transformer model."""

    _instance: EmbeddingService | None = None
    _instance_lock = threading.Lock()

    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
    ) -> None:
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(
            model_name,
            revision=EMBEDDING_MODEL_REVISION,
        )
        self._encode_lock = threading.Lock()
        logger.info("Embedding model loaded: %s", model_name)

    @classmethod
    def get_instance(cls) -> EmbeddingService:
        """Singleton accessor to avoid reloading the model."""
        with cls._instance_lock:
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

        with self._encode_lock:
            embeddings = self.model.encode(
                texts,
                batch_size=128,
                show_progress_bar=len(texts) > 50,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )

        return embeddings.astype(np.float32)
