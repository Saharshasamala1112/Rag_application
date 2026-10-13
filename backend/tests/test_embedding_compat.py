"""Focused tests for embedding configuration wiring and index provenance.

The sentence-transformers package (and any real model download) is never
involved: the loader is stubbed through sys.modules and every compatibility
decision is exercised against synthetic FAISS indexes and metadata.
"""

from __future__ import annotations

import json
import logging
import sys
import types
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from app.config.settings import settings
from app.rag.embedding_compat import (
    EmbeddingIdentity,
    active_identity,
    compatibility_error,
    read_embedding_provenance,
)
from app.rag.embeddings import (
    KNOWN_MODEL_REVISIONS,
    EmbeddingService,
    revision_for_model,
)

BGE_MODEL = "BAAI/bge-small-en-v1.5"
BGE_REVISION = KNOWN_MODEL_REVISIONS[BGE_MODEL]


@pytest.fixture(autouse=True)
def _isolated_singleton():
    """Every test in this module starts and ends with no cached singleton."""
    EmbeddingService.reset_instance()
    yield
    EmbeddingService.reset_instance()


def _install_stub_transformers(monkeypatch: pytest.MonkeyPatch, dimension: int = 384):
    """Replace sentence_transformers with a recording stub of the given dimension."""
    calls: list[dict] = []

    class StubSentenceTransformer:
        def __init__(self, model_name: str, revision: str | None = None, **_kwargs):
            self.model_name = model_name
            self.revision = revision
            calls.append({"model_name": model_name, "revision": revision})

        def get_sentence_embedding_dimension(self) -> int:
            return dimension

        def encode(self, texts: list[str], **_kwargs) -> np.ndarray:
            return np.zeros((len(texts), dimension), dtype=np.float32)

    monkeypatch.setitem(
        sys.modules,
        "sentence_transformers",
        types.SimpleNamespace(SentenceTransformer=StubSentenceTransformer),
    )
    return calls


class TestEmbeddingServiceConfiguration:
    def test_configured_model_name_reaches_the_loader(self, monkeypatch):
        calls = _install_stub_transformers(monkeypatch, dimension=384)
        with patch.object(settings, "embedding_model", "acme/custom-model"):
            service = EmbeddingService()

        assert calls == [{"model_name": "acme/custom-model", "revision": None}]
        assert service.model_name == "acme/custom-model"
        assert service.revision is None

    def test_default_model_keeps_name_and_revision_pin(self, monkeypatch):
        calls = _install_stub_transformers(monkeypatch, dimension=384)
        with patch.object(settings, "embedding_model", BGE_MODEL):
            service = EmbeddingService()

        assert calls == [{"model_name": BGE_MODEL, "revision": BGE_REVISION}]
        assert service.model_name == BGE_MODEL
        assert service.revision == BGE_REVISION
        assert service.dimension == 384

    def test_unpinned_models_never_inherit_another_models_revision(self, monkeypatch):
        calls = _install_stub_transformers(monkeypatch, dimension=384)
        with patch.object(settings, "embedding_model", "acme/unpinned-model"):
            EmbeddingService()

        assert calls[0]["revision"] is None
        assert revision_for_model("acme/unpinned-model") is None
        assert revision_for_model(BGE_MODEL) == BGE_REVISION

    def test_dimension_mismatch_raises_a_clear_error(self, monkeypatch):
        _install_stub_transformers(monkeypatch, dimension=768)
        with (
            patch.object(settings, "embedding_dim", 384),
            pytest.raises(ValueError) as excinfo,
        ):
            EmbeddingService(model_name="acme/seven-sixty-eight")

        message = str(excinfo.value)
        assert "384" in message
        assert "768" in message
        assert "acme/seven-sixty-eight" in message

    def test_empty_input_uses_the_resolved_dimension(self, monkeypatch):
        _install_stub_transformers(monkeypatch, dimension=768)
        with patch.object(settings, "embedding_dim", 768):
            service = EmbeddingService(model_name="acme/seven-sixty-eight")

        empty = service.encode([])
        assert empty.shape == (0, 768)
        assert empty.dtype == np.float32

    def test_singleton_peek_and_reset_never_load_a_model(self, monkeypatch):
        _install_stub_transformers(monkeypatch)
        EmbeddingService.reset_instance()
        assert EmbeddingService.peek_instance() is None

        first = EmbeddingService.get_instance()
        assert EmbeddingService.peek_instance() is first
        assert EmbeddingService.get_instance() is first

        EmbeddingService.reset_instance()
        assert EmbeddingService.peek_instance() is None


class TestActiveIdentity:
    def test_falls_back_to_settings_while_unloaded(self):
        EmbeddingService.reset_instance()
        with (
            patch.object(settings, "embedding_model", BGE_MODEL),
            patch.object(settings, "embedding_dim", 384),
        ):
            identity = active_identity()

        assert identity == EmbeddingIdentity(BGE_MODEL, 384, BGE_REVISION)

    def test_loaded_singleton_is_preferred_over_settings(self, monkeypatch):
        _install_stub_transformers(monkeypatch)
        with patch.object(settings, "embedding_model", BGE_MODEL):
            loaded = EmbeddingService(model_name="acme/actually-loaded")
        monkeypatch.setattr(EmbeddingService, "_instance", loaded)

        assert active_identity() == EmbeddingIdentity("acme/actually-loaded", 384, None)

    def test_explicit_service_is_preferred_over_the_singleton(self, monkeypatch):
        _install_stub_transformers(monkeypatch)
        loaded = EmbeddingService(model_name="acme/singleton")
        monkeypatch.setattr(EmbeddingService, "_instance", loaded)
        other = EmbeddingService(model_name="acme/passed-in")

        assert active_identity(other).model == "acme/passed-in"


class TestReadEmbeddingProvenance:
    def test_missing_or_corrupt_metadata_returns_none(self, tmp_path: Path):
        assert read_embedding_provenance(tmp_path) is None

        (tmp_path / "document_info.json").write_text("{not json", encoding="utf-8")
        assert read_embedding_provenance(tmp_path) is None

    def test_valid_metadata_is_returned(self, tmp_path: Path):
        info = {"embedding_model": "acme/model", "embedding_dim": 384}
        (tmp_path / "document_info.json").write_text(
            json.dumps(info), encoding="utf-8"
        )

        assert read_embedding_provenance(tmp_path) == info


class TestCompatibilityError:
    IDENTITY = EmbeddingIdentity(model=BGE_MODEL, dimension=384, revision=BGE_REVISION)

    def test_matching_provenance_is_accepted(self, tmp_path: Path):
        provenance = {
            "embedding_model": BGE_MODEL,
            "embedding_revision": BGE_REVISION,
            "embedding_dim": 384,
        }
        assert (
            compatibility_error(tmp_path / "doc", 384, provenance, self.IDENTITY)
            is None
        )

    def test_index_dimension_mismatch_is_refused(self, tmp_path: Path):
        provenance = {"embedding_model": BGE_MODEL, "embedding_dim": 384}
        error = compatibility_error(tmp_path / "doc", 768, provenance, self.IDENTITY)

        assert error is not None
        assert "768" in error
        assert "384" in error
        assert "re-upload" in error

    def test_recorded_model_mismatch_is_refused(self, tmp_path: Path):
        provenance = {"embedding_model": "acme/other-model", "embedding_dim": 384}
        error = compatibility_error(tmp_path / "doc", 384, provenance, self.IDENTITY)

        assert error is not None
        assert "acme/other-model" in error
        assert BGE_MODEL in error

    def test_recorded_revision_mismatch_is_refused(self, tmp_path: Path):
        provenance = {
            "embedding_model": BGE_MODEL,
            "embedding_revision": "deadbeef",
            "embedding_dim": 384,
        }
        error = compatibility_error(tmp_path / "doc", 384, provenance, self.IDENTITY)

        assert error is not None
        assert "deadbeef" in error
        assert BGE_REVISION in error

    def test_recorded_dimension_contradiction_is_refused(self, tmp_path: Path):
        provenance = {"embedding_model": BGE_MODEL, "embedding_dim": 768}
        error = compatibility_error(tmp_path / "doc", 384, provenance, self.IDENTITY)

        assert error is not None
        assert "768" in error

    def test_legacy_document_with_matching_dimension_is_accepted_with_warning(
        self, tmp_path: Path, caplog: pytest.LogCaptureFixture
    ):
        caplog.set_level(logging.WARNING)

        error = compatibility_error(tmp_path / "legacy-doc", 384, None, self.IDENTITY)

        assert error is None
        assert "no embedding provenance metadata" in caplog.text
        assert "legacy policy" in caplog.text

    def test_legacy_document_never_claims_its_model_is_known(
        self, tmp_path: Path, caplog: pytest.LogCaptureFixture
    ):
        caplog.set_level(logging.WARNING)

        compatibility_error(tmp_path / "legacy-doc", 384, None, self.IDENTITY)

        # The verdict must describe the metadata as absent, not attribute a model.
        assert "has no embedding provenance metadata" in caplog.text
        assert "indexed with embedding model" not in caplog.text

    def test_legacy_document_with_incompatible_dimension_is_refused(
        self, tmp_path: Path, caplog: pytest.LogCaptureFixture
    ):
        caplog.set_level(logging.WARNING)

        error = compatibility_error(tmp_path / "legacy-doc", 768, None, self.IDENTITY)

        assert error is not None
        assert "768" in error
        assert "re-upload" in error
        assert "legacy policy" not in caplog.text

    def test_unknown_active_dimension_skips_the_dimension_check(self, tmp_path: Path):
        identity = EmbeddingIdentity(model="acme/model", dimension=None, revision=None)
        provenance = {"embedding_model": "acme/model"}

        assert compatibility_error(tmp_path / "doc", 5, provenance, identity) is None
