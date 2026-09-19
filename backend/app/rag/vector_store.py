from __future__ import annotations

import logging
from pathlib import Path

import faiss
import numpy as np

logger = logging.getLogger(__name__)


class VectorStore:
    """Manage FAISS vector indexes with persistence."""

    @staticmethod
    def save(
        embeddings: np.ndarray,
        output_dir: Path,
    ) -> None:
        """Save embeddings into a FAISS index."""

        if embeddings.size == 0:
            return

        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings.astype(np.float32))

        output_dir.mkdir(parents=True, exist_ok=True)
        faiss.write_index(index, str(output_dir / "faiss.index"))

        logger.info("Saved FAISS index with %d vectors (dim=%d).", index.ntotal, dimension)

    @staticmethod
    def load(output_dir: Path) -> faiss.Index | None:
        """Load an existing FAISS index."""
        index_path = output_dir / "faiss.index"
        if not index_path.exists():
            logger.warning("No FAISS index found at %s", index_path)
            return None
        return faiss.read_index(str(index_path))

    @staticmethod
    def get_embeddings(index: faiss.Index) -> np.ndarray:
        """Extract stored embeddings from a FAISS index."""
        if index.ntotal == 0:
            return np.empty((0, index.d), dtype=np.float32)
        embeddings = np.array([index.reconstruct(i) for i in range(index.ntotal)])
        return embeddings.astype(np.float32)

    @staticmethod
    def build_index(embeddings: np.ndarray) -> faiss.Index:
        """Build an in-memory FAISS index from embeddings."""
        if embeddings.size == 0:
            return faiss.IndexFlatIP(384)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings.astype(np.float32))
        return index
