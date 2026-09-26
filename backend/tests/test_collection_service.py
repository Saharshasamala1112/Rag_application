from __future__ import annotations

import json
import re
from pathlib import Path
from unittest.mock import patch

from app.config.settings import settings
from app.services import collection_service

_COLLECTION_ID = re.compile(r"^[0-9a-f]{12}$")


def test_collection_crud_round_trip(tmp_path: Path):
    with patch.object(settings, "upload_dir", tmp_path):
        created = collection_service.create_collection(
            name="Research",
            description="Notes",
            document_ids=["doc-1"],
        )
        collection_id = created["collection_id"]
        assert _COLLECTION_ID.fullmatch(collection_id)
        assert (tmp_path / "collections" / f"{collection_id}.json").exists()

        listed = collection_service.list_collections()
        assert [item["collection_id"] for item in listed] == [collection_id]

        fetched = collection_service.get_collection(collection_id)
        assert fetched is not None
        assert fetched["name"] == "Research"

        updated = collection_service.update_collection(
            collection_id,
            description="Updated",
            document_ids=["doc-1", "doc-2"],
        )
        assert updated is not None
        assert updated["description"] == "Updated"
        assert updated["document_ids"] == ["doc-1", "doc-2"]
        assert updated["created_at"] == created["created_at"]

        assert collection_service.delete_collection(collection_id) is True
        assert collection_service.get_collection(collection_id) is None
        assert collection_service.list_collections() == []
        assert collection_service.delete_collection(collection_id) is False


def test_missing_or_invalid_collection_ids_are_rejected(tmp_path: Path):
    outside = tmp_path / "outside.json"
    with patch.object(settings, "upload_dir", tmp_path):
        assert collection_service.get_collection("does-not-exist") is None
        assert collection_service.delete_collection("does-not-exist") is False
        assert collection_service.update_collection("../outside", name="x") is None
        assert collection_service.get_collection("..") is None
    assert not outside.exists()
    assert not list(tmp_path.glob("*.json"))


def test_unreadable_collection_files_are_skipped(tmp_path: Path):
    collections_dir = tmp_path / "collections"
    collections_dir.mkdir(parents=True)
    (collections_dir / "aaaaaaaaaaaa.json").write_text("{corrupt", encoding="utf-8")
    (collections_dir / "bbbbbbbbbbbb.json").write_text(
        json.dumps(
            {
                "collection_id": "bbbbbbbbbbbb",
                "name": "Healthy",
                "description": "",
                "document_ids": [],
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        ),
        encoding="utf-8",
    )

    with patch.object(settings, "upload_dir", tmp_path):
        collections = collection_service.list_collections()
        assert [item["collection_id"] for item in collections] == ["bbbbbbbbbbbb"]
        assert collection_service.get_collection("aaaaaaaaaaaa") is None


def test_writes_are_atomic_and_leave_no_temporary_files(tmp_path: Path):
    with patch.object(settings, "upload_dir", tmp_path):
        created = collection_service.create_collection(name="Research")
        collection_id = created["collection_id"]
        collection_service.update_collection(collection_id, name="Renamed")

        files = list((tmp_path / "collections").iterdir())
        assert [path.name for path in files] == [f"{collection_id}.json"]
        assert not list((tmp_path / "collections").glob("*.tmp"))
