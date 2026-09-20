from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config.settings import settings


@pytest.fixture()
def client():
    """Create a test client with a temp upload directory."""
    from app.main import app

    with tempfile.TemporaryDirectory() as td:
        with patch("app.config.settings.settings.upload_dir", Path(td)):
            with patch("app.main.settings.upload_dir", Path(td)):
                with TestClient(app, raise_server_exceptions=False) as c:
                    yield c


class TestRootEndpoint:
    def test_root_returns_info(self, client: TestClient):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "DocuChat RAG API"
        assert "version" in data
        assert "docs" in data


class TestRequestMiddleware:
    def test_request_id_header(self, client: TestClient):
        resp = client.get("/")
        assert "X-Request-ID" in resp.headers
        assert len(resp.headers["X-Request-ID"]) == 8

    def test_response_time_header(self, client: TestClient):
        resp = client.get("/")
        assert "X-Response-Time" in resp.headers
        assert resp.headers["X-Response-Time"].endswith("ms")


class TestHealthEndpoint:
    def test_health_returns_status(self, client: TestClient):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "model_configured" in data
        assert "embedding_model" in data


class TestDocumentsEndpoint:
    def test_list_documents_empty(self, client: TestClient):
        resp = client.get("/api/v1/documents")
        assert resp.status_code == 200
        data = resp.json()
        assert "documents" in data
        assert data["documents"] == []

    def test_documents_count_zero(self, client: TestClient):
        resp = client.get("/api/v1/documents")
        data = resp.json()
        assert data["total"] == 0


class TestUploadEndpoint:
    def test_upload_text_file(self, client: TestClient):
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("test.txt", b"Hello world content for testing.", "text/plain")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "document_id" in data
        assert data["filename"] == "test.txt"
        assert "chunk_count" in data
        assert data["chunk_count"] >= 1

    def test_upload_csv_file(self, client: TestClient):
        csv_content = b"name,age\nAlice,30\nBob,25"
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("data.csv", csv_content, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"] == "data.csv"
        assert data["chunk_count"] >= 1

    def test_upload_json_file(self, client: TestClient):
        json_content = json.dumps({"key": "value", "list": [1, 2, 3]}).encode()
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("data.json", json_content, "application/json")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"] == "data.json"

    def test_upload_unsupported_file_rejected(self, client: TestClient):
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("test.exe", b"binary data", "application/octet-stream")},
        )
        # Should return 422 or 400 for unsupported file type
        assert resp.status_code in (400, 422)

    def test_upload_empty_file(self, client: TestClient):
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        # Should handle empty file gracefully
        assert resp.status_code in (200, 400, 422)

    def test_upload_malicious_filename(self, client: TestClient):
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("../../../etc/passwd.txt", b"not real passwd", "text/plain")},
        )
        # Should sanitize or reject
        assert resp.status_code in (200, 400, 422)


class TestUploadSupportedTypesEndpoint:
    def test_returns_supported_types(self, client: TestClient):
        resp = client.get("/api/v1/upload/supported-types")
        assert resp.status_code == 200
        data = resp.json()
        assert "types" in data
        exts = [t["extension"] for t in data["types"]]
        assert ".pdf" in exts
        assert ".txt" in exts


class TestQueryEndpoint:
    def test_query_no_documents(self, client: TestClient):
        resp = client.post(
            "/api/v1/query",
            json={"question": "What is this about?"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "No documents" in data["answer"] or "no documents" in data["answer"].lower()

    def test_query_empty_question(self, client: TestClient):
        resp = client.post(
            "/api/v1/query",
            json={"question": ""},
        )
        assert resp.status_code == 422

    def test_query_missing_question(self, client: TestClient):
        resp = client.post(
            "/api/v1/query",
            json={},
        )
        assert resp.status_code == 422


class TestEndToEnd:
    def test_upload_then_documents_list(self, client: TestClient):
        # Upload two documents
        for name, content in [("a.txt", b"Content A"), ("b.txt", b"Content B")]:
            resp = client.post(
                "/api/v1/upload",
                files={"file": (name, content, "text/plain")},
            )
            assert resp.status_code == 200

        # List documents
        list_resp = client.get("/api/v1/documents")
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert data["total"] == 2
        filenames = [d["filename"] for d in data["documents"]]
        assert "a.txt" in filenames
        assert "b.txt" in filenames

    def test_upload_then_delete(self, client: TestClient):
        # Upload
        upload_resp = client.post(
            "/api/v1/upload",
            files={"file": ("delme.txt", b"Delete me content", "text/plain")},
        )
        assert upload_resp.status_code == 200
        doc_id = upload_resp.json()["document_id"]

        # Delete
        del_resp = client.delete(f"/api/v1/documents/{doc_id}")
        assert del_resp.status_code == 200

        # Verify gone
        list_resp = client.get("/api/v1/documents")
        assert list_resp.json()["total"] == 0
