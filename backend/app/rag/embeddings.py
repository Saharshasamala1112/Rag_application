from __future__ import annotations

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Generate embeddings using a Sentence Transformer model."""

    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
    ) -> None:
        self.model = SentenceTransformer(model_name)

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
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        return embeddings.astype(np.float32)
