from __future__ import annotations

import logging
import os
import threading
import uuid
from collections import OrderedDict
from pathlib import Path

import faiss
import numpy as np

logger = logging.getLogger(__name__)


class VectorStore:
    """Manage FAISS vector indexes with persistence."""

    _index_cache: OrderedDict[tuple[str, int, int], faiss.Index] = OrderedDict()
    _search_cache: OrderedDict[
        tuple[tuple[str, int, int, int, int], ...], faiss.Index
    ] = OrderedDict()
    _cache_lock = threading.RLock()
    _index_access_lock = threading.RLock()
    _cache_limit = 16

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
        index_path = output_dir / "faiss.index"
        temporary_path = output_dir / f".faiss.index-{uuid.uuid4().hex}.tmp"
        try:
            with VectorStore._index_access_lock:
                faiss.write_index(index, str(temporary_path))
                os.replace(temporary_path, index_path)
        finally:
            temporary_path.unlink(missing_ok=True)
        VectorStore.invalidate_cache()

        logger.info(
            "Saved FAISS index with %d vectors (dim=%d).",
            index.ntotal,
            dimension,
        )

    @classmethod
    def load(cls, output_dir: Path) -> faiss.Index | None:
        """Load an existing FAISS index."""
        index_path = output_dir / "faiss.index"
        if not index_path.exists():
            logger.warning("No FAISS index found at %s", index_path)
            return None
        try:
            stat = index_path.stat()
        except OSError as error:
            logger.error("Could not stat FAISS index at %s: %s", index_path, error)
            return None

        key = (str(index_path.resolve()), stat.st_mtime_ns, stat.st_size)
        with cls._cache_lock:
            cached = cls._index_cache.get(key)
            if cached is not None:
                cls._index_cache.move_to_end(key)
                return cached

            try:
                with cls._index_access_lock:
                    index = faiss.read_index(str(index_path))
            except (RuntimeError, OSError, ValueError) as error:
                logger.error("Could not read FAISS index at %s: %s", index_path, error)
                return None

            cls._index_cache[key] = index
            cls._trim_caches()
            return index

    @classmethod
    def search_index(
        cls,
        document_dirs: list[Path],
        indexes: list[faiss.Index],
    ) -> faiss.Index | None:
        """Return a cached combined search index for an unchanged corpus."""
        if not indexes:
            return None
        if len(document_dirs) != len(indexes):
            logger.error(
                "Cannot combine FAISS indexes: received %d directories for %d indexes.",
                len(document_dirs),
                len(indexes),
            )
            return None
        if len(indexes) == 1:
            return indexes[0]

        signatures = []
        try:
            for document_dir in document_dirs:
                index_stat = (document_dir / "faiss.index").stat()
                chunks_stat = (document_dir / "chunks.json").stat()
                signatures.append(
                    (
                        str(document_dir.resolve()),
                        index_stat.st_mtime_ns,
                        index_stat.st_size,
                        chunks_stat.st_mtime_ns,
                        chunks_stat.st_size,
                    )
                )
        except OSError as error:
            logger.error("Could not stat document retrieval data: %s", error)
            return None

        cache_key = tuple(signatures)
        with cls._cache_lock:
            cached = cls._search_cache.get(cache_key)
            if cached is not None:
                cls._search_cache.move_to_end(cache_key)
                return cached

            if len({index.d for index in indexes}) != 1:
                logger.error("Cannot combine FAISS indexes with different dimensions.")
                return None
            with cls._index_access_lock:
                embeddings = [cls.get_embeddings(index) for index in indexes]
                try:
                    combined = cls.build_index(np.vstack(embeddings))
                except (RuntimeError, ValueError) as error:
                    logger.error("Could not combine FAISS indexes: %s", error)
                    return None
            cls._search_cache[cache_key] = combined
            cls._trim_caches()
            return combined

    @classmethod
    def invalidate_cache(cls) -> None:
        with cls._cache_lock:
            cls._index_cache.clear()
            cls._search_cache.clear()

    @classmethod
    def _trim_caches(cls) -> None:
        while len(cls._index_cache) > cls._cache_limit:
            cls._index_cache.popitem(last=False)
        while len(cls._search_cache) > cls._cache_limit:
            cls._search_cache.popitem(last=False)

    @staticmethod
    def get_embeddings(index: faiss.Index) -> np.ndarray:
        """Extract stored embeddings from a FAISS index using bulk reconstruction."""
        if index.ntotal == 0:
            return np.empty((0, index.d), dtype=np.float32)
        embeddings = index.reconstruct_n(0, index.ntotal)
        return np.array(embeddings, dtype=np.float32)

    @staticmethod
    def build_index(embeddings: np.ndarray) -> faiss.Index:
        """Build an in-memory FAISS index from embeddings."""
        if embeddings.size == 0:
            return faiss.IndexFlatIP(384)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings.astype(np.float32))
        return index
