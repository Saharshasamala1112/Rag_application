"""Collection management routes."""

import json
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config.settings import settings

router = APIRouter(tags=["Collections"])

COLLECTIONS_DIR = settings.upload_dir / "collections"


def _ensure_dir() -> None:
    COLLECTIONS_DIR.mkdir(parents=True, exist_ok=True)


def _collection_path(collection_id: str) -> Path:
    return COLLECTIONS_DIR / f"{collection_id}.json"


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    document_ids: list[str] = []


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    document_ids: list[str] | None = None


class CollectionResponse(BaseModel):
    collection_id: str
    name: str
    description: str
    document_ids: list[str]
    created_at: str
    updated_at: str


class CollectionListResponse(BaseModel):
    collections: list[CollectionResponse]
    total: int


@router.get("/collections")
def list_collections() -> CollectionListResponse:
    _ensure_dir()
    collections = []
    for f in sorted(COLLECTIONS_DIR.iterdir()):
        if f.suffix != ".json":
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            collections.append(CollectionResponse(**data))
        except (json.JSONDecodeError, OSError):
            continue
    return CollectionListResponse(collections=collections, total=len(collections))


@router.post("/collections")
def create_collection(body: CollectionCreate) -> CollectionResponse:
    _ensure_dir()
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    collection_id = str(uuid.uuid4())[:12]
    data = {
        "collection_id": collection_id,
        "name": body.name,
        "description": body.description,
        "document_ids": body.document_ids,
        "created_at": now,
        "updated_at": now,
    }
    _collection_path(collection_id).write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return CollectionResponse(**data)


@router.get("/collections/{collection_id}")
def get_collection(collection_id: str) -> CollectionResponse:
    path = _collection_path(collection_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Collection not found.")
    data = json.loads(path.read_text(encoding="utf-8"))
    return CollectionResponse(**data)


@router.patch("/collections/{collection_id}")
def update_collection(collection_id: str, body: CollectionUpdate) -> CollectionResponse:
    path = _collection_path(collection_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Collection not found.")

    data = json.loads(path.read_text(encoding="utf-8"))
    if body.name is not None:
        data["name"] = body.name
    if body.description is not None:
        data["description"] = body.description
    if body.document_ids is not None:
        data["document_ids"] = body.document_ids
    data["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return CollectionResponse(**data)


@router.delete("/collections/{collection_id}")
def delete_collection(collection_id: str) -> dict:
    path = _collection_path(collection_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Collection not found.")
    path.unlink()
    return {"message": "Collection deleted.", "collection_id": collection_id}
