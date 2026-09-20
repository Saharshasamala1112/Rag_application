from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.config.settings import settings
from app.models.request import QueryRequest
from app.services.query_service import QueryService


class TestResolveDocumentDirs:
    def test_specific_existing_document(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            doc_dir = Path(td) / "doc1"
            doc_dir.mkdir()
            (doc_dir / "chunks.json").write_text("[]")

            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs("doc1")
                assert len(result) == 1
                assert result[0].name == "doc1"

    def test_specific_nonexistent_document(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs("nonexistent")
                assert result == []

    def test_all_documents(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            for name in ["a", "b", "c"]:
                d = Path(td) / name
                d.mkdir()
                (d / "chunks.json").write_text("[]")
            # Add a dir without chunks.json (should be excluded)
            (Path(td) / "no_chunks").mkdir()

            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs(None)
                assert len(result) == 3
                names = [d.name for d in result]
                assert "a" in names
                assert "b" in names
                assert "c" in names
                assert "no_chunks" not in names


class TestDeduplicateChunks:
    def test_removes_duplicates(self):
        svc = QueryService.__new__(QueryService)
        chunks = [
            {"content": "Same content here and more text that goes on", "chunk_id": 1},
            {"content": "Same content here and more text that goes on", "chunk_id": 2},
            {"content": "Different content entirely", "chunk_id": 3},
        ]
        result = svc._deduplicate_chunks(chunks)
        assert len(result) == 2

    def test_no_duplicates(self):
        svc = QueryService.__new__(QueryService)
        chunks = [
            {"content": "Unique chunk one", "chunk_id": 1},
            {"content": "Unique chunk two", "chunk_id": 2},
        ]
        result = svc._deduplicate_chunks(chunks)
        assert len(result) == 2

    def test_empty_input(self):
        svc = QueryService.__new__(QueryService)
        assert svc._deduplicate_chunks([]) == []


class TestBuildContext:
    def test_basic_context(self):
        svc = QueryService.__new__(QueryService)
        chunks = [
            {"content": "First chunk content", "source": "file.txt", "page_number": 1, "header": "Intro"},
            {"content": "Second chunk content", "source": "file.txt", "page_number": 2, "header": None},
        ]
        context = svc._build_context(chunks)
        assert "[Source 1]" in context
        assert "[Source 2]" in context
        assert "file.txt" in context
        assert "Page 1" in context
        assert "Intro" in context
        assert "First chunk content" in context

    def test_respects_token_budget(self):
        svc = QueryService.__new__(QueryService)
        big_content = "x" * 3000
        chunks = [
            {"content": big_content, "source": "a.txt", "page_number": 1},
            {"content": big_content, "source": "b.txt", "page_number": 2},
            {"content": big_content, "source": "c.txt", "page_number": 3},
        ]
        context = svc._build_context(chunks)
        # Should be capped around MAX_CONTEXT_CHARS (6000)
        assert len(context) <= 6200  # slight margin for metadata

    def test_empty_chunks(self):
        svc = QueryService.__new__(QueryService)
        context = svc._build_context([])
        assert context == ""


class TestBuildSources:
    def test_builds_source_chunks(self):
        svc = QueryService.__new__(QueryService)
        chunks = [
            {"chunk_id": 0, "content": "text a", "source": "a.txt", "score": 0.9, "page_number": 1, "header": "H1"},
            {"chunk_id": 1, "content": "text b", "source": "b.txt", "score": 0.6, "page_number": 2, "header": None},
        ]
        sources = svc._build_sources(chunks)
        assert len(sources) == 2
        # Scores normalized: 0.9 is max, so should be 100%
        assert sources[0].score == 100
        assert sources[1].score == round((0.6 / 0.9) * 100)
        assert sources[0].source == "a.txt"
        assert sources[1].page_number == 2

    def test_empty_sources(self):
        svc = QueryService.__new__(QueryService)
        assert svc._build_sources([]) == []

    def test_content_truncated(self):
        svc = QueryService.__new__(QueryService)
        long_text = "x" * 600
        chunks = [{"chunk_id": 0, "content": long_text, "source": "a.txt", "score": 0.5}]
        sources = svc._build_sources(chunks)
        assert len(sources[0].content) <= 500


class TestQueryNoDocuments:
    def test_returns_no_docs_message(self):
        with tempfile.TemporaryDirectory() as td:
            with patch.object(settings, "upload_dir", Path(td)):
                svc = QueryService.__new__(QueryService)
                svc.retriever = MagicMock()
                svc.llm = MagicMock()
                svc.reranker = MagicMock()
                req = QueryRequest(question="What is this?")
                resp = svc.query(req)
                assert "No documents" in resp.answer
                assert resp.sources == []


class TestQueryStreamNoDocuments:
    def test_yields_error(self):
        with tempfile.TemporaryDirectory() as td:
            with patch.object(settings, "upload_dir", Path(td)):
                svc = QueryService.__new__(QueryService)
                svc.retriever = MagicMock()
                svc.llm = MagicMock()
                svc.reranker = MagicMock()
                req = QueryRequest(question="What is this?")
                events = list(svc.query_stream(req))
                assert len(events) == 1
                assert events[0]["type"] == "error"
                assert "No documents" in events[0]["content"]
