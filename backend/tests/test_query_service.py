from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.config.settings import settings
from app.exceptions import LLMError
from app.models.request import QueryRequest
from app.services.query_service import QueryService


class TestResolveDocumentDirs:
    def test_specific_existing_document(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            document_id = "12345678-abc"
            doc_dir = Path(td) / document_id
            doc_dir.mkdir()
            (doc_dir / "chunks.json").write_text("[]")
            (doc_dir / "faiss.index").write_bytes(b"index")

            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs(document_id)
                assert len(result) == 1
                assert result[0].name == document_id

    def test_specific_nonexistent_document(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs("12345678-abc")
                assert result == []

    def test_all_documents(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            for name in ["00000000-001", "00000000-002", "00000000-003"]:
                d = Path(td) / name
                d.mkdir()
                (d / "chunks.json").write_text("[]")
                (d / "faiss.index").write_bytes(b"index")
            # Add a dir without chunks.json (should be excluded)
            (Path(td) / "no_chunks").mkdir()

            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs(None)
                assert len(result) == 3
                names = [d.name for d in result]
                assert "00000000-001" in names
                assert "00000000-002" in names
                assert "00000000-003" in names
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
        assert sources[0].score == 1.0
        assert sources[1].score == round(0.6 / 0.9, 4)
        assert all(0 <= source.score <= 1 for source in sources)
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

    def test_rerank_score_is_used_for_reported_relevance(self):
        svc = QueryService.__new__(QueryService)
        sources = svc._build_sources([
            {
                "chunk_id": 0,
                "content": "best",
                "source": "a.txt",
                "score": 0.1,
                "rerank_score": 8.0,
            },
            {
                "chunk_id": 1,
                "content": "next",
                "source": "b.txt",
                "score": 0.2,
                "rerank_score": 4.0,
            },
        ])

        assert [source.score for source in sources] == [1.0, 0.5]

    def test_negative_rerank_scores_keep_relevance_order(self):
        svc = QueryService.__new__(QueryService)
        sources = svc._build_sources(
            [
                {
                    "chunk_id": 0,
                    "content": "best",
                    "source": "a.txt",
                    "rerank_score": -1.0,
                },
                {
                    "chunk_id": 1,
                    "content": "next",
                    "source": "b.txt",
                    "rerank_score": -3.0,
                },
            ]
        )

        assert [source.score for source in sources] == [1.0, 0.0]


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


def test_reranking_runs_when_candidate_count_is_below_top_k(tmp_path: Path):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.reranker = MagicMock()
    service.llm = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": index,
            "content": f"Unique candidate {index}",
            "source": "doc.txt",
            "score": 0.5,
        }
        for index in range(12)
    ]
    service.reranker.rerank.side_effect = lambda **kwargs: kwargs["chunks"]
    service.llm.generate.return_value = "answer"

    service.query(QueryRequest(question="question", top_k=20))

    service.reranker.rerank.assert_called_once()


def test_query_propagates_llm_errors(tmp_path: Path):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {"chunk_id": 0, "content": "evidence", "source": "doc.txt", "score": 1.0}
    ]
    service.reranker = MagicMock()
    service.llm = MagicMock()
    service.llm.generate.side_effect = LLMError("model unavailable")

    with pytest.raises(LLMError, match="model unavailable"):
        service.query(QueryRequest(question="question", use_reranking=False))


def test_conversation_history_excludes_current_question_and_limits_message_size():
    service = QueryService.__new__(QueryService)
    messages = [
        {"role": "user", "content": "previous question"},
        {"role": "assistant", "content": "previous answer"},
        {"role": "user", "content": "current question"},
    ]
    with patch(
        "app.services.query_service.conversation_service.get_conversation",
        return_value={"messages": messages},
    ):
        history = service._conversation_history(
            QueryRequest(
                question="current question",
                conversation_id="conv-123456789abc",
            )
        )

    assert history == messages[:2]
