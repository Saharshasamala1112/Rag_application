from __future__ import annotations

import logging
import threading

import numpy as np

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Known-good revision pins, keyed by model name. A revision pin belongs to one
# specific model checkpoint and must never be applied to a different model, so
# models without an entry are loaded unpinned (revision=None).
KNOWN_MODEL_REVISIONS = {
    "BAAI/bge-small-en-v1.5": "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a",
}


def revision_for_model(model_name: str) -> str | None:
    """Return the pinned revision for a model, or None when the model is unpinned."""
    return KNOWN_MODEL_REVISIONS.get(model_name)


class EmbeddingService:
    """Generate embeddings using a Sentence Transformer model.

    The model is selected by ``settings.embedding_model`` unless a specific
    ``model_name`` is passed. The model's real output dimension is validated
    against ``settings.embedding_dim`` at load time so a silent mismatch can
    never produce an index that cannot be searched later.
    """

    _instance: EmbeddingService | None = None
    _instance_lock = threading.Lock()

    def __init__(
        self,
        model_name: str | None = None,
    ) -> None:
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name or settings.embedding_model
        self.revision = revision_for_model(self.model_name)
        self.model = SentenceTransformer(
            self.model_name,
            revision=self.revision,
        )
        self._dimension = int(self.model.get_sentence_embedding_dimension())
        if self._dimension != settings.embedding_dim:
            raise ValueError(
                f"EMBEDDING_DIM is set to {settings.embedding_dim} but embedding "
                f"model '{self.model_name}' produces {self._dimension}-dimensional "
                f"vectors. Set EMBEDDING_DIM={self._dimension} or configure an "
                f"embedding model that produces {settings.embedding_dim}-dimensional "
                f"vectors."
            )
        self._encode_lock = threading.Lock()
        logger.info(
            "Embedding model loaded: %s (revision=%s, dim=%d).",
            self.model_name,
            self.revision,
            self._dimension,
        )

    @property
    def dimension(self) -> int:
        """The resolved output dimension of the loaded model."""
        return self._dimension

    @classmethod
    def get_instance(cls) -> EmbeddingService:
        """Singleton accessor to avoid reloading the model."""
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    @classmethod
    def peek_instance(cls) -> EmbeddingService | None:
        """Return the loaded singleton, or None. Never loads a model."""
        with cls._instance_lock:
            return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Drop the cached singleton so the next access loads a fresh model."""
        with cls._instance_lock:
            cls._instance = None

    def encode(
        self,
        texts: list[str],
    ) -> np.ndarray:
        """Generate normalized embeddings."""

        if not texts:
            return np.empty((0, self._dimension), dtype=np.float32)

        with self._encode_lock:
            embeddings = self.model.encode(
                texts,
                batch_size=128,
                show_progress_bar=len(texts) > 50,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )

        return embeddings.astype(np.float32)
