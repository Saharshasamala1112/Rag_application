from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
import tiktoken

from app.config.settings import settings
from app.exceptions import LLMError
from app.models.request import QueryRequest
from app.query_stream_contract import (
    QUERY_STREAM_EVENTS,
    QUERY_STREAM_STATUSES,
    QUERY_STREAM_TRACE_STEPS,
)
from app.rag.vector_store import VectorStore
from app.services.query_service import (
    INSUFFICIENT_CONTEXT_ANSWER,
    QueryService,
    _validate_citations,
)


def _write_index(directory: Path, dimension: int = 384) -> None:
    """Write a real single-vector FAISS index into a document directory."""
    VectorStore.save(
        np.zeros((1, dimension), dtype=np.float32),
        directory,
    )


class TestResolveDocumentDirs:
    def test_specific_existing_document(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            document_id = "12345678-abc"
            doc_dir = Path(td) / document_id
            doc_dir.mkdir()
            (doc_dir / "chunks.json").write_text("[]")
            _write_index(doc_dir)

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
                _write_index(d)
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

    def test_incompatible_dimension_document_is_excluded_from_search_all(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            compatible = Path(td) / "00000000-001"
            compatible.mkdir()
            (compatible / "chunks.json").write_text("[]")
            _write_index(compatible, dimension=384)

            incompatible = Path(td) / "00000000-002"
            incompatible.mkdir()
            (incompatible / "chunks.json").write_text("[]")
            _write_index(incompatible, dimension=768)

            with patch.object(settings, "upload_dir", Path(td)):
                result = svc.resolve_document_dirs(None)

            assert [d.name for d in result] == ["00000000-001"]

    def test_document_indexed_with_other_model_is_excluded(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            foreign = Path(td) / "00000000-009"
            foreign.mkdir()
            (foreign / "chunks.json").write_text("[]")
            _write_index(foreign, dimension=384)
            (foreign / "document_info.json").write_text(
                json.dumps(
                    {
                        "status": "ready",
                        "embedding_model": "acme/other-model",
                        "embedding_revision": None,
                        "embedding_dim": 384,
                    }
                ),
                encoding="utf-8",
            )

            with patch.object(settings, "upload_dir", Path(td)):
                assert svc.resolve_document_dirs(None) == []
                assert svc.resolve_document_dirs("00000000-009") == []

    def test_unreadable_index_is_excluded(self):
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            corrupt = Path(td) / "00000000-007"
            corrupt.mkdir()
            (corrupt / "chunks.json").write_text("[]")
            (corrupt / "faiss.index").write_bytes(b"index")

            with patch.object(settings, "upload_dir", Path(td)):
                assert svc.resolve_document_dirs(None) == []
                assert svc.resolve_document_dirs("00000000-007") == []

    @pytest.mark.parametrize(
        "metadata_payload",
        ["[1, 2, 3]", '"just a string"', "42", "{not json"],
        ids=["list-root", "string-root", "int-root", "malformed-json"],
    )
    def test_invalid_metadata_is_excluded_from_search_all_and_specific_query(
        self, metadata_payload: str
    ):
        """Invalid metadata is excluded consistently, matching the retriever.

        A non-dict metadata root (e.g. ``[1, 2, 3]``) used to crash the
        readiness gate on ``info.get("status")``. It is now excluded, the same
        way the retriever skips the document.
        """
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            invalid = Path(td) / "00000000-005"
            invalid.mkdir()
            (invalid / "chunks.json").write_text("[]")
            _write_index(invalid, dimension=384)
            (invalid / "document_info.json").write_text(metadata_payload, encoding="utf-8")

            with patch.object(settings, "upload_dir", Path(td)):
                assert svc.resolve_document_dirs(None) == []
                assert svc.resolve_document_dirs("00000000-005") == []

    def test_valid_legacy_metadata_is_still_included_in_search_all(self):
        """A provenance-free document with a matching dimension stays usable."""
        with tempfile.TemporaryDirectory() as td:
            svc = QueryService.__new__(QueryService)
            legacy = Path(td) / "00000000-006"
            legacy.mkdir()
            (legacy / "chunks.json").write_text("[]")
            _write_index(legacy, dimension=384)
            # No document_info.json at all — a genuinely legacy index.

            with patch.object(settings, "upload_dir", Path(td)):
                assert [d.name for d in svc.resolve_document_dirs(None)] == [
                    "00000000-006"
                ]
                assert [d.name for d in svc.resolve_document_dirs("00000000-006")] == [
                    "00000000-006"
                ]


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

    def test_keeps_chunks_that_differ_after_the_first_two_hundred_characters(self):
        svc = QueryService.__new__(QueryService)
        prefix = "same " * 41
        chunks = [
            {"content": prefix + "first"},
            {"content": prefix + "second"},
        ]

        assert len(svc._deduplicate_chunks(chunks)) == 2

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
        big_content = "x " * 4000
        chunks = [
            {"content": big_content, "source": "a.txt", "page_number": 1},
            {"content": big_content, "source": "b.txt", "page_number": 2},
            {"content": big_content, "source": "c.txt", "page_number": 3},
        ]
        context = svc._build_context(chunks)
        encoding = tiktoken.get_encoding("cl100k_base")
        assert len(encoding.encode(context)) <= settings.max_context_tokens
        assert len(context) > 100

    def test_does_not_emit_a_near_empty_partial_context(self):
        svc = QueryService.__new__(QueryService)
        chunks = [{"content": "evidence " * 100, "source": "long-name.txt"}]
        with patch.object(settings, "max_context_tokens", 10):
            assert svc._build_context(chunks) == ""

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
                "rerank_score": 0.8,
            },
            {
                "chunk_id": 1,
                "content": "next",
                "source": "b.txt",
                "score": 0.2,
                "rerank_score": 0.4,
            },
        ])

        assert [source.score for source in sources] == [0.8, 0.4]

    def test_negative_rerank_scores_are_clamped_to_the_api_range(self):
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

        assert [source.score for source in sources] == [0.0, 0.0]


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


def test_query_happy_path_retrieves_context_and_returns_citations(tmp_path: Path):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 7,
            "content": "The handbook defines the review period as 30 days.",
            "source": "handbook.txt",
            "score": 0.02,
            "page_number": 4,
            "header": "Review",
        }
    ]
    service.reranker = MagicMock()
    service.llm = MagicMock()
    service.llm.generate.return_value = "The review period is 30 days [Source 1]."

    response = service.query(
        QueryRequest(question="How long is the review period?", use_reranking=False)
    )

    assert response.answer == "The review period is 30 days [Source 1]."
    assert response.sources[0].source == "handbook.txt"
    assert response.sources[0].chunk_id == 7
    service.llm.generate.assert_called_once()
    assert "30 days" in service.llm.generate.call_args.kwargs["context"]
    assert 'trust="untrusted"' in service.llm.generate.call_args.kwargs["context"]


def test_query_removes_model_citations_outside_source_range(tmp_path: Path):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 1,
            "content": "Evidence.",
            "source": "manual.txt",
            "score": 0.02,
        }
    ]
    service.reranker = MagicMock()
    service.llm = MagicMock()
    service.llm.generate.return_value = (
        "Valid [Source 1], invalid [Source 2]."
    )

    response = service.query(
        QueryRequest(question="Question?", use_reranking=False)
    )

    assert response.answer == "Valid [Source 1], invalid ."


def test_query_reports_rerank_score_for_the_selected_source(tmp_path: Path):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 1,
            "content": "Evidence.",
            "source": "manual.txt",
            "score": 0.0001,
        }
    ]
    service.reranker = MagicMock()
    service.reranker.rerank.return_value = [
        {
            "chunk_id": 1,
            "content": "Evidence.",
            "source": "manual.txt",
            "score": 0.0001,
            "rerank_score": 0.6,
        }
    ]
    service.llm = MagicMock()
    service.llm.generate.return_value = "Answer [Source 1]."

    response = service.query(
        QueryRequest(question="Question?", use_reranking=True)
    )

    assert response.sources[0].score == 0.6
    assert service.llm.generate.call_args.kwargs["context"].find("Evidence.") >= 0


def test_invalid_citations_are_removed_but_valid_citations_remain():
    assert _validate_citations(
        "Evidence [Source 1], unsupported [Source 3], and [Source 2].",
        source_count=2,
    ) == "Evidence [Source 1], unsupported , and [Source 2]."


def test_citation_filter_preserves_non_citation_source_wording():
    assert _validate_citations(
        "The term [Source reliability] is a heading; see [Source 1].",
        source_count=1,
    ) == "The term [Source reliability] is a heading; see [Source 1]."


def test_rerank_threshold_keeps_top_candidates_when_all_scores_fall_below_it(
    tmp_path: Path,
):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 0,
            "content": "weak evidence",
            "source": "doc.txt",
            "score": 0.02,
        }
    ]
    service.reranker = MagicMock()
    service.reranker.rerank.return_value = [
        {"chunk_id": 0, "content": "weak evidence", "rerank_score": 0.1}
    ]
    service.llm = MagicMock()
    service.llm.generate.return_value = "Answer [Source 1]."

    response = service.query(
        QueryRequest(question="question", use_reranking=True)
    )

    assert response.answer == "Answer [Source 1]."
    assert response.sources[0].score == 0.1
    service.llm.generate.assert_called_once()


def test_rerank_threshold_drops_weak_candidates_when_stronger_ones_pass(
    tmp_path: Path,
):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 0,
            "content": "strong evidence",
            "source": "doc.txt",
            "score": 0.5,
        },
        {
            "chunk_id": 1,
            "content": "weak evidence",
            "source": "doc.txt",
            "score": 0.3,
        },
    ]
    service.reranker = MagicMock()
    service.reranker.rerank.return_value = [
        {"chunk_id": 0, "content": "strong evidence", "rerank_score": 0.9},
        {"chunk_id": 1, "content": "weak evidence", "rerank_score": 0.05},
    ]
    service.llm = MagicMock()
    service.llm.generate.return_value = "Answer [Source 1]."

    response = service.query(
        QueryRequest(question="question", use_reranking=True)
    )

    assert [source.chunk_id for source in response.sources] == [0]
    context = service.llm.generate.call_args.kwargs["context"]
    assert "strong evidence" in context
    assert "weak evidence" not in context


def test_tiny_context_budget_returns_insufficient_context_without_generation(
    tmp_path: Path,
):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 0,
            "content": "evidence " * 100,
            "source": "long-source-name.txt",
            "score": 0.02,
        }
    ]
    service.reranker = MagicMock()
    service.llm = MagicMock()

    with patch.object(settings, "max_context_tokens", 10):
        response = service.query(
            QueryRequest(question="question", use_reranking=False)
        )

    assert response.answer == INSUFFICIENT_CONTEXT_ANSWER
    assert response.sources == []
    service.llm.generate.assert_not_called()


def test_query_stream_emits_all_contract_stages_in_order(tmp_path: Path):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 1,
            "content": "Grounded evidence.",
            "source": "manual.txt",
            "score": 0.02,
        }
    ]
    service.reranker = MagicMock()
    service.reranker.rerank.side_effect = lambda **kwargs: kwargs["chunks"]
    service.llm = MagicMock()
    service.llm.generate_stream.return_value = iter(["Answer."])

    events = list(
        service.query_stream(
            QueryRequest(question="Question?", use_reranking=True)
        )
    )

    assert [event["content"] for event in events if event["type"] == QUERY_STREAM_EVENTS["status"]] == [
        QUERY_STREAM_STATUSES["retrieving"]["text"],
        QUERY_STREAM_STATUSES["reranking"]["text"],
        QUERY_STREAM_STATUSES["context"]["text"],
        QUERY_STREAM_STATUSES["generating"]["text"],
    ]
    assert [
        event["content"]["step"]
        for event in events
        if event["type"] == QUERY_STREAM_EVENTS["trace"]
    ] == list(QUERY_STREAM_TRACE_STEPS)
    assert events[-1]["type"] == QUERY_STREAM_EVENTS["done"]


def test_query_stream_filters_invalid_citations_across_token_boundaries(
    tmp_path: Path,
):
    service = QueryService.__new__(QueryService)
    service.resolve_document_dirs = lambda _document_id: [tmp_path]
    service.retriever = MagicMock()
    service.retriever.retrieve.return_value = [
        {
            "chunk_id": 1,
            "content": "evidence",
            "source": "manual.txt",
            "score": 0.02,
        }
    ]
    service.reranker = MagicMock()
    service.llm = MagicMock()
    service.llm.generate_stream.return_value = iter(
        ["Answer [Sour", "ce 2] and [Source 1]."]
    )

    events = list(
        service.query_stream(
            QueryRequest(question="Question?", use_reranking=False)
        )
    )
    streamed_answer = "".join(
        event["content"]
        for event in events
        if event["type"] == QUERY_STREAM_EVENTS["token"]
    )

    assert streamed_answer == "Answer  and [Source 1]."
    assert events[-1]["type"] == QUERY_STREAM_EVENTS["done"]


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
