from __future__ import annotations

import asyncio
import json
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config.settings import settings
from app.middleware import RequestBodyLimitMiddleware


class _TestEmbeddingService:
    def encode(self, texts: list[str]) -> np.ndarray:
        return np.ones((len(texts), settings.embedding_dim), dtype=np.float32)


@pytest.fixture()
def client():
    """Create a test client with a temp upload directory."""
    from app.main import app

    with tempfile.TemporaryDirectory() as td:
        with patch("app.config.settings.settings.upload_dir", Path(td)):
            with patch("app.main.settings.upload_dir", Path(td)):
                with patch.object(settings, "api_key", SecretStr("test-api-key")):
                    with patch(
                        "app.rag.embeddings.EmbeddingService.get_instance",
                        return_value=_TestEmbeddingService(),
                    ):
                        with TestClient(
                            app,
                            headers={"X-API-Key": "test-api-key"},
                            raise_server_exceptions=False,
                        ) as c:
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

    def test_caller_request_id_is_echoed_and_logged(
        self, client: TestClient, caplog: pytest.LogCaptureFixture
    ):
        caplog.set_level("INFO")
        response = client.get("/", headers={"X-Request-ID": "abc"})

        assert response.headers["X-Request-ID"] == "abc"
        assert any("[abc]" in record.getMessage() for record in caplog.records)

    def test_metrics_expose_request_count_and_duration(self, client: TestClient):
        client.get("/")
        response = client.get("/metrics")

        assert response.status_code == 200
        assert "http_requests_total" in response.text
        assert "http_request_duration_milliseconds_count" in response.text
        assert 'route="/"' in response.text


class TestHealthEndpoint:
    def test_health_returns_status(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(
            type(settings),
            "get_available_ollama_models",
            lambda _self: [settings.ollama_model],
        )
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert set(data) == {
            "status",
            "version",
            "model",
            "embedding_model",
            "ollama_available",
            "document_count",
        }

    def test_health_does_not_require_api_key(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(
            type(settings),
            "get_available_ollama_models",
            lambda _self: [settings.ollama_model],
        )
        resp = client.get("/api/v1/health", headers={"X-API-Key": "invalid"})
        assert resp.status_code == 200

    def test_live_probe_is_independent_of_ollama(self, client: TestClient):
        response = client.get("/api/v1/health/live", headers={"X-API-Key": "invalid"})
        assert response.status_code == 200
        assert response.json() == {"status": "alive"}

    def test_readiness_reports_unavailable_ollama(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(type(settings), "get_available_ollama_models", lambda _self: [])
        response = client.get("/api/v1/health/ready")
        assert response.status_code == 503
        assert response.json()["detail"]["ollama_available"] is False

    def test_startup_does_not_contact_ollama(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ):
        from app.main import on_startup

        monkeypatch.setattr(settings, "upload_dir", tmp_path)

        def fail_if_called(_self):
            raise AssertionError("startup must not contact Ollama")

        monkeypatch.setattr(type(settings), "get_available_ollama_models", fail_if_called)
        on_startup()


class TestAPIKeyMiddleware:
    def test_protected_routes_require_a_valid_api_key(self, client: TestClient):
        resp = client.get("/api/v1/documents", headers={"X-API-Key": "invalid"})
        assert resp.status_code == 401
        assert "X-API-Key" in resp.json()["detail"]

    def test_missing_server_api_key_fails_closed(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(settings, "api_key", None)
        resp = client.get("/api/v1/documents")
        assert resp.status_code == 503


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
            files={
                "file": ("test.txt", b"Hello world content for testing.", "text/plain")
            },
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
        assert resp.status_code == 400

    def test_upload_empty_file(self, client: TestClient):
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert resp.status_code == 400

    def test_upload_traversal_filename_cannot_escape_upload_directory(
        self,
        client: TestClient,
        tmp_path: Path,
        monkeypatch: pytest.MonkeyPatch,
    ):
        upload_dir = tmp_path / "uploads"
        upload_dir.mkdir()
        sentinel = tmp_path / "escape.txt"
        sentinel.write_text("keep", encoding="utf-8")
        monkeypatch.setattr(settings, "upload_dir", upload_dir)
        resp = client.post(
            "/api/v1/upload",
            files={
                "file": (
                    "../../escape.txt",
                    b"not real passwd",
                    "text/plain",
                )
            },
        )
        assert resp.status_code == 200
        assert resp.json()["filename"] == "../../escape.txt"
        assert (upload_dir / resp.json()["document_id"] / "original.txt").is_file()
        assert sentinel.read_text(encoding="utf-8") == "keep"

    def test_upload_rejects_file_over_configured_limit(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(settings, "max_file_size_mb", 1)
        resp = client.post(
            "/api/v1/upload",
            files={"file": ("large.txt", b"x" * (1024 * 1024 + 1), "text/plain")},
        )
        assert resp.status_code == 413

    def test_text_upload_rejects_content_over_configured_limit(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr(settings, "max_file_size_mb", 1)
        resp = client.post(
            "/api/v1/upload/text",
            json={"content": "x" * (1024 * 1024 + 1), "filename": "large.txt"},
        )
        assert resp.status_code == 413


class TestUploadSupportedTypesEndpoint:
    def test_returns_supported_types(self, client: TestClient):
        resp = client.get("/api/v1/upload/supported-types")
        assert resp.status_code == 200
        data = resp.json()
        assert "types" in data
        assert data["total"] == len(data["types"])
        assert all(set(item) == {"extension", "description"} for item in data["types"])
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
        assert set(data) == {
            "answer",
            "sources",
            "retrieval_time_ms",
            "generation_time_ms",
            "total_time_ms",
        }
        assert "No documents" in data["answer"] or (
            "no documents" in data["answer"].lower()
        )

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


def test_query_stream_emits_events_and_persists_completed_conversation(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import query as query_route

    conversation = query_route.conversation_service.create_conversation()
    sources = [
        {
            "chunk_id": 1,
            "content": "grounded evidence",
            "source": "manual.txt",
            "score": 0.9,
            "page_number": 1,
            "header": None,
        }
    ]
    stream_events = [
        {"type": "status", "content": "Retrieving relevant chunks..."},
        {"type": "sources", "content": sources},
        {"type": "token", "content": "A grounded "},
        {"type": "token", "content": "answer."},
        {"type": "done", "content": "", "total_time_ms": 12.5},
    ]
    monkeypatch.setattr(
        query_route.query_service,
        "query_stream",
        lambda _request: iter(stream_events),
    )

    response = client.post(
        "/api/v1/query/stream",
        json={
            "question": "What does the manual say?",
            "conversation_id": conversation["conversation_id"],
        },
    )

    events = [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    stored = query_route.conversation_service.get_conversation(
        conversation["conversation_id"]
    )

    assert response.status_code == 200
    assert [event["type"] for event in events] == [
        "status",
        "sources",
        "token",
        "token",
        "done",
    ]
    assert set(events[0]) == {"type", "content"}
    assert set(events[-1]) == {"type", "content", "total_time_ms"}
    assert stored is not None
    assert [message["role"] for message in stored["messages"]] == [
        "user",
        "assistant",
    ]
    assert stored["messages"][1]["content"] == "A grounded answer."
    assert stored["messages"][1]["sources"] == sources


def test_collections_crud_uses_a_redirected_temporary_directory(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import collections as collections_route

    collection_dir = tmp_path / "collections"
    monkeypatch.setattr(collections_route, "COLLECTIONS_DIR", collection_dir)

    created = client.post(
        "/api/v1/collections",
        json={"name": "Research", "description": "Test collection"},
    )
    assert created.status_code == 200
    collection = created.json()
    collection_id = collection["collection_id"]
    assert list(collection_dir.iterdir()) == [collection_dir / f"{collection_id}.json"]

    listing = client.get("/api/v1/collections")
    assert listing.status_code == 200
    assert listing.json()["collections"][0]["name"] == "Research"

    updated = client.patch(
        f"/api/v1/collections/{collection_id}",
        json={"document_ids": ["document-1"]},
    )
    assert updated.status_code == 200
    assert updated.json()["document_ids"] == ["document-1"]

    deleted = client.delete(f"/api/v1/collections/{collection_id}")
    assert deleted.status_code == 200
    assert list(collection_dir.iterdir()) == []


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

    def test_document_delete_rejects_traversal_and_reserved_names(
        self, client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ):
        upload_dir = tmp_path / "uploads"
        upload_dir.mkdir()
        sentinel = tmp_path / "sentinel.txt"
        sentinel.write_text("keep")
        monkeypatch.setattr(settings, "upload_dir", upload_dir)

        for document_id in ("..", "%2e%2e", "conversations", "collections"):
            response = client.delete(f"/api/v1/documents/{document_id}")
            assert response.status_code == 404
            assert sentinel.read_text() == "keep"
            assert list(upload_dir.iterdir()) == []


def test_synchronous_upload_runs_off_the_event_loop(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import health, upload

    def slow_upload(**_kwargs):
        time.sleep(0.3)
        return {
            "document_id": "12345678-abc",
            "filename": "slow.txt",
            "chunk_count": 1,
        }

    monkeypatch.setattr(upload.upload_service, "process_upload_stream", slow_upload)
    monkeypatch.setattr(
        type(health.settings),
        "get_available_ollama_models",
        lambda _self: [health.settings.ollama_model],
    )
    monkeypatch.setattr(
        type(health.settings),
        "resolve_model",
        lambda _self: "test-model",
    )
    monkeypatch.setattr(health.upload_service, "list_documents", lambda: [])

    with ThreadPoolExecutor(max_workers=1) as executor:
        upload_request = executor.submit(
            client.post,
            "/api/v1/upload",
            files={"file": ("slow.txt", b"content", "text/plain")},
        )
        time.sleep(0.05)
        started = time.perf_counter()
        health_response = client.get("/api/v1/health")
        elapsed = time.perf_counter() - started

    assert health_response.status_code == 200
    assert elapsed < 0.2
    assert upload_request.result().status_code == 200


def test_query_stream_does_not_block_health(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import health, query

    def slow_events(_request):
        time.sleep(0.3)
        yield {"type": "done", "content": ""}

    monkeypatch.setattr(query.query_service, "query_stream", slow_events)
    monkeypatch.setattr(
        type(health.settings),
        "get_available_ollama_models",
        lambda _self: [health.settings.ollama_model],
    )
    monkeypatch.setattr(
        type(health.settings),
        "resolve_model",
        lambda _self: "test-model",
    )
    monkeypatch.setattr(health.upload_service, "list_documents", lambda: [])

    with ThreadPoolExecutor(max_workers=1) as executor:
        query_request = executor.submit(
            client.post,
            "/api/v1/query/stream",
            json={"question": "What is this?"},
        )
        time.sleep(0.05)
        started = time.perf_counter()
        health_response = client.get("/api/v1/health")
        elapsed = time.perf_counter() - started

    assert health_response.status_code == 200
    assert elapsed < 0.2
    assert query_request.result().status_code == 200


def test_request_body_limit_rejects_chunked_overflow():
    messages = [
        {"type": "http.request", "body": b"1234", "more_body": True},
        {"type": "http.request", "body": b"5678", "more_body": False},
    ]
    sent = []

    async def receive():
        return messages.pop(0)

    async def send(message):
        sent.append(message)

    async def consume_request(_scope, limited_receive, _send):
        while True:
            message = await limited_receive()
            if not message.get("more_body"):
                return

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/v1/upload",
        "raw_path": b"/api/v1/upload",
        "query_string": b"",
        "headers": [],
        "server": ("testserver", 80),
        "client": ("testclient", 1234),
    }

    asyncio.run(
        RequestBodyLimitMiddleware(consume_request, max_body_size=6)(
            scope, receive, send
        )
    )

    response_start = next(
        message for message in sent if message["type"] == "http.response.start"
    )
    assert response_start["status"] == 413


def test_unknown_conversation_is_rejected_by_query(client: TestClient):
    response = client.post(
        "/api/v1/query",
        json={
            "question": "What is this?",
            "conversation_id": "conv-000000000000",
        },
    )

    assert response.status_code == 404


def test_llm_failure_returns_503_without_persisting_an_answer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import query as query_route
    from app.exceptions import LLMError

    conversation = query_route.conversation_service.create_conversation()
    monkeypatch.setattr(
        query_route.query_service,
        "resolve_document_dirs",
        lambda _document_id: [Path("document")],
    )

    def fail_query(_request):
        raise LLMError("model unavailable")

    monkeypatch.setattr(query_route.query_service, "query", fail_query)
    response = client.post(
        "/api/v1/query",
        json={
            "question": "What is this?",
            "conversation_id": conversation["conversation_id"],
        },
    )

    stored = query_route.conversation_service.get_conversation(
        conversation["conversation_id"]
    )
    assert response.status_code == 503
    assert stored is not None
    assert [message["role"] for message in stored["messages"]] == ["user"]


def test_stream_error_is_terminal_and_not_saved_as_an_answer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import query as query_route

    conversation = query_route.conversation_service.create_conversation()
    monkeypatch.setattr(
        query_route.query_service,
        "resolve_document_dirs",
        lambda _document_id: [],
    )

    def failed_events(_request):
        yield {"type": "error", "content": "model unavailable"}

    monkeypatch.setattr(query_route.query_service, "query_stream", failed_events)
    response = client.post(
        "/api/v1/query/stream",
        json={
            "question": "What is this?",
            "conversation_id": conversation["conversation_id"],
        },
    )

    stored = query_route.conversation_service.get_conversation(
        conversation["conversation_id"]
    )
    assert response.status_code == 200
    assert '"type": "error"' in response.text
    assert stored is not None
    assert [message["role"] for message in stored["messages"]] == ["user"]


def test_query_rejects_unknown_conversation_id(client: TestClient):
    response = client.post(
        "/api/v1/query",
        json={
            "question": "What is this?",
            "conversation_id": "conv-000000000000",
        },
    )
    assert response.status_code == 404


def test_stream_disconnect_persists_interrupted_answer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    from app.api.routes import query as query_route
    from app.models.request import QueryRequest

    conversation = query_route.conversation_service.create_conversation()
    monkeypatch.setattr(
        query_route.query_service,
        "resolve_document_dirs",
        lambda _document_id: [],
    )

    def partial_events(_request):
        yield {"type": "token", "content": "partial "}
        yield {"type": "token", "content": "answer"}

    monkeypatch.setattr(query_route.query_service, "query_stream", partial_events)
    request = QueryRequest(
        question="What is this?",
        conversation_id=conversation["conversation_id"],
    )
    response = asyncio.run(query_route.query_stream(request))

    async def disconnect_after_partial_answer():
        stream = response.body_iterator
        await anext(stream)
        await anext(stream)
        await stream.aclose()

    asyncio.run(disconnect_after_partial_answer())
    stored = query_route.conversation_service.get_conversation(
        conversation["conversation_id"]
    )
    assert stored is not None
    assert stored["messages"][-1]["content"] == "partial "
    assert stored["messages"][-1]["interrupted"] is True


class TestConversationsEndpoint:
    def test_list_empty(self, client: TestClient):
        resp = client.get("/api/v1/conversations")
        assert resp.status_code == 200
        data = resp.json()
        assert data["conversations"] == []
        assert data["total"] == 0

    def test_create_and_get(self, client: TestClient):
        resp = client.post(
            "/api/v1/conversations",
            json={"title": "Test conversation"},
        )
        assert resp.status_code == 200
        conv = resp.json()
        assert conv["title"] == "Test conversation"
        cid = conv["conversation_id"]

        # Get
        get_resp = client.get(f"/api/v1/conversations/{cid}")
        assert get_resp.status_code == 200
        assert get_resp.json()["conversation_id"] == cid

    def test_create_default_title(self, client: TestClient):
        resp = client.post("/api/v1/conversations")
        assert resp.status_code == 200
        assert resp.json()["title"] == "New conversation"

    def test_update_title(self, client: TestClient):
        resp = client.post(
            "/api/v1/conversations",
            json={"title": "Original"},
        )
        cid = resp.json()["conversation_id"]

        update_resp = client.patch(
            f"/api/v1/conversations/{cid}",
            json={"title": "Updated"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "Updated"

    def test_delete(self, client: TestClient):
        resp = client.post("/api/v1/conversations")
        cid = resp.json()["conversation_id"]

        del_resp = client.delete(f"/api/v1/conversations/{cid}")
        assert del_resp.status_code == 200

        # Verify gone
        get_resp = client.get(f"/api/v1/conversations/{cid}")
        assert get_resp.status_code == 404

    def test_get_nonexistent(self, client: TestClient):
        resp = client.get("/api/v1/conversations/conv-nonexistent")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client: TestClient):
        resp = client.delete("/api/v1/conversations/conv-nonexistent")
        assert resp.status_code == 404
