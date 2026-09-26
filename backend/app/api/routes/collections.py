"""Collection management routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.collection import (
    CollectionCreate,
    CollectionDeleteResponse,
    CollectionListResponse,
    CollectionResponse,
    CollectionUpdate,
)
from app.services import collection_service

router = APIRouter(tags=["Collections"])


@router.get("/collections", response_model=CollectionListResponse)
def list_collections() -> CollectionListResponse:
    collections = collection_service.list_collections()
    return CollectionListResponse(
        collections=[CollectionResponse(**data) for data in collections],
        total=len(collections),
    )


@router.post("/collections", response_model=CollectionResponse)
def create_collection(body: CollectionCreate) -> CollectionResponse:
    data = collection_service.create_collection(
        name=body.name,
        description=body.description,
        document_ids=body.document_ids,
    )
    return CollectionResponse(**data)


@router.get("/collections/{collection_id}", response_model=CollectionResponse)
def get_collection(collection_id: str) -> CollectionResponse:
    data = collection_service.get_collection(collection_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Collection not found.")
    return CollectionResponse(**data)


@router.patch(
    "/collections/{collection_id}", response_model=CollectionResponse
)
def update_collection(collection_id: str, body: CollectionUpdate) -> CollectionResponse:
    data = collection_service.update_collection(
        collection_id,
        name=body.name,
        description=body.description,
        document_ids=body.document_ids,
    )
    if data is None:
        raise HTTPException(status_code=404, detail="Collection not found.")
    return CollectionResponse(**data)


@router.delete(
    "/collections/{collection_id}", response_model=CollectionDeleteResponse
)
def delete_collection(collection_id: str) -> CollectionDeleteResponse:
    if not collection_service.delete_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found.")
    return CollectionDeleteResponse(
        message="Collection deleted.", collection_id=collection_id
    )
