"""Collection persistence service.

Mirrors :mod:`app.services.conversation_service`: paths are validated, writes
are atomic and guarded by a re-entrant lock, and missing collections are
reported as ``None`` so routes can translate them into 404s.
"""

from __future__ import annotations

import json
import logging
import os
import re
import tempfile
import threading
import time
import uuid
from pathlib import Path

from app.config.settings import settings

logger = logging.getLogger(__name__)
_COLLECTION_ID_PATTERN = re.compile(r"^[0-9a-f]{12}$")
_collection_lock = threading.RLock()


def _collections_dir() -> Path:
    directory = settings.upload_dir / "collections"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _collection_path(collection_id: str) -> Path:
    if not _COLLECTION_ID_PATTERN.fullmatch(collection_id):
        raise ValueError("Invalid collection ID.")
    return _collections_dir() / f"{collection_id}.json"


def _load(collection_id: str) -> dict | None:
    try:
        path = _collection_path(collection_id)
    except ValueError:
        return None
    with _collection_lock:
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Dropping unreadable collection %s.", collection_id)
            return None


def _save(collection_id: str, data: dict) -> None:
    path = _collection_path(collection_id)
    temporary_path: Path | None = None
    with _collection_lock:
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=path.parent,
                prefix=f".{collection_id}-",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                json.dump(data, temporary_file, indent=2, ensure_ascii=False)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_path, path)
        except Exception:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise


def create_collection(
    name: str,
    description: str = "",
    document_ids: list[str] | None = None,
) -> dict:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    collection_id = uuid.uuid4().hex[:12]
    data = {
        "collection_id": collection_id,
        "name": name,
        "description": description,
        "document_ids": list(document_ids or []),
        "created_at": now,
        "updated_at": now,
    }
    _save(collection_id, data)
    return data


def list_collections() -> list[dict]:
    collections: list[dict] = []
    with _collection_lock:
        for path in sorted(_collections_dir().iterdir()):
            if path.suffix != ".json":
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                collections.append(data)
            except (json.JSONDecodeError, OSError):
                logger.warning("Skipping unreadable collection file %s.", path.name)
                continue
    return collections


def get_collection(collection_id: str) -> dict | None:
    return _load(collection_id)


def update_collection(
    collection_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    document_ids: list[str] | None = None,
) -> dict | None:
    with _collection_lock:
        data = _load(collection_id)
        if data is None:
            return None
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
        if document_ids is not None:
            data["document_ids"] = document_ids
        data["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _save(collection_id, data)
        return data


def delete_collection(collection_id: str) -> bool:
    try:
        path = _collection_path(collection_id)
    except ValueError:
        return False
    with _collection_lock:
        if not path.exists():
            return False
        path.unlink()
        return True
