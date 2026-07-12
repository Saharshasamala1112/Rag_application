from __future__ import annotations

from pathlib import Path

import faiss
import numpy as np


class VectorStore:
    """Manage FAISS vector indexes."""

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

        index.add(embeddings)

        faiss.write_index(
            index,
            str(output_dir / "faiss.index"),
        )

    @staticmethod
    def load(
        output_dir: Path,
    ) -> faiss.Index:
        """Load an existing FAISS index."""

        return faiss.read_index(
            str(output_dir / "faiss.index"),
        )