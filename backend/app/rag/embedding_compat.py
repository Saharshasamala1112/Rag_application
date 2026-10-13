"""Embedding provenance and index-compatibility checks.

Documents record which embedding model, revision and dimension produced their
FAISS index (``document_info.json``). Before an index takes part in retrieval
its recorded provenance is compared against the active embedding configuration
so a stale or foreign index is skipped with an actionable error instead of
crashing the FAISS search or silently returning nonsense results.

This module is strictly read-only: it never modifies, rewrites or deletes a
document directory. Incompatible documents must be re-uploaded by the user.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from app.config.settings import settings
from app.rag.embeddings import EmbeddingService, revision_for_model

logger = logging.getLogger(__name__)

#: Keys persisted in ``document_info.json`` to describe an index's origin.
PROVENANCE_KEYS = ("embedding_model", "embedding_revision", "embedding_dim")


@dataclass(frozen=True)
class EmbeddingIdentity:
    """The embedding configuration compatibility decisions are made against."""

    model: str
    dimension: int | None
    revision: str | None


def active_identity(service: EmbeddingService | None = None) -> EmbeddingIdentity:
    """Resolve the active embedding identity without loading a model.

    Preference order: an explicitly passed (already loaded) service, the
    process-wide singleton when one exists, otherwise the configured settings.
    """
    if service is not None:
        return EmbeddingIdentity(
            model=service.model_name,
            dimension=service.dimension,
            revision=service.revision,
        )
    loaded = EmbeddingService.peek_instance()
    if loaded is not None:
        return EmbeddingIdentity(
            model=loaded.model_name,
            dimension=loaded.dimension,
            revision=loaded.revision,
        )
    return EmbeddingIdentity(
        model=settings.embedding_model,
        dimension=settings.embedding_dim,
        revision=revision_for_model(settings.embedding_model),
    )


@dataclass(frozen=True)
class ProvenanceRead:
    """Outcome of reading ``document_info.json`` for a compatibility check.

    ``data`` holds the parsed metadata only when it is a JSON object; any other
    shape (list, string, number, ...) or a read/parse failure leaves it ``None``.
    ``state`` distinguishes the three cases that matter:

    * ``ok``      — a JSON object was read successfully.
    * ``missing`` — no metadata file exists (a genuinely provenance-free legacy
      index; accepted under the legacy policy).
    * ``invalid`` — the file exists but could not be read, was not valid JSON,
      or did not hold a JSON object. Never treated as legacy.
    """

    data: dict | None
    state: Literal["ok", "missing", "invalid"]
    detail: str | None = None


def read_embedding_provenance(document_dir: Path) -> ProvenanceRead:
    """Read ``document_info.json`` for a compatibility check.

    Distinguishes a genuinely legacy (missing) metadata file from one that is
    present but unusable, so callers never mistake corrupt metadata for an
    index that predates provenance tracking.
    """
    info_file = document_dir / "document_info.json"
    try:
        raw = info_file.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ProvenanceRead(data=None, state="missing")
    except OSError as exc:
        return ProvenanceRead(data=None, state="invalid", detail=str(exc))

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        return ProvenanceRead(data=None, state="invalid", detail=str(exc))

    if not isinstance(parsed, dict):
        # e.g. ``[1, 2, 3]``, ``"text"``, ``42`` — valid JSON, but not a
        # metadata object, so nothing in it can be trusted as provenance.
        return ProvenanceRead(
            data=None,
            state="invalid",
            detail=f"expected a JSON object, found {type(parsed).__name__}",
        )

    return ProvenanceRead(data=parsed, state="ok")


def compatibility_error(
    document_dir: Path,
    index_dimension: int,
    provenance: ProvenanceRead,
    identity: EmbeddingIdentity,
) -> str | None:
    """Return an actionable error when a stored index cannot be used safely.

    Returns ``None`` when the index may participate in retrieval.

    Legacy policy: documents indexed before provenance tracking existed have no
    recorded model. They are accepted only while their index dimension matches
    the active model, a warning is logged, and their embedding model is treated
    as unknown — never claimed to be the active model. An incompatible legacy
    index is refused with the same actionable guidance as a recorded mismatch.

    Invalid metadata (present but unreadable, malformed, or not a JSON object)
    is never accepted as legacy: it is refused with an actionable error, so a
    corrupt file cannot smuggle an unverifiable index into retrieval.
    """
    label = document_dir.name

    if identity.dimension is not None and index_dimension != identity.dimension:
        return (
            f"Document '{label}' stores {index_dimension}-dimensional vectors but "
            f"the active embedding model '{identity.model}' produces "
            f"{identity.dimension}-dimensional vectors. Delete the document and "
            f"re-upload it to rebuild the index with the current model."
        )

    if provenance.state == "invalid":
        return (
            f"Document '{label}' has unusable index metadata "
            f"({provenance.detail or 'unreadable'}). It cannot be verified "
            f"against the active embedding model '{identity.model}'. Delete the "
            f"document and re-upload it to rebuild the index."
        )

    if provenance.data is not None and not isinstance(provenance.data, dict):
        # Defensive: a non-object payload is never valid provenance, even if a
        # caller hand-built a ProvenanceRead claiming an "ok" read. Refuse it
        # rather than letting it fall through to the legacy policy.
        return (
            f"Document '{label}' has unusable index metadata "
            f"(expected a JSON object, found {type(provenance.data).__name__}). "
            f"It cannot be verified against the active embedding model "
            f"'{identity.model}'. Delete the document and re-upload it to "
            f"rebuild the index."
        )

    data = provenance.data or {}

    recorded_model = data.get("embedding_model")
    if recorded_model is None:
        logger.warning(
            "Document '%s' has no embedding provenance metadata (indexed before "
            "provenance tracking). Accepting it under the legacy policy because "
            "its index dimension matches the active model '%s'.",
            label,
            identity.model,
        )
        return None

    if recorded_model != identity.model:
        return (
            f"Document '{label}' was indexed with embedding model "
            f"'{recorded_model}' but the active model is '{identity.model}'. "
            f"Delete the document and re-upload it to rebuild the index with "
            f"the current model."
        )

    recorded_revision = data.get("embedding_revision")
    if (
        recorded_revision is not None
        and identity.revision is not None
        and recorded_revision != identity.revision
    ):
        return (
            f"Document '{label}' was indexed with '{identity.model}' revision "
            f"'{recorded_revision}' but the active revision is "
            f"'{identity.revision}'. Delete the document and re-upload it to "
            f"rebuild the index."
        )

    recorded_dimension = data.get("embedding_dim")
    if (
        recorded_dimension is not None
        and identity.dimension is not None
        and recorded_dimension != identity.dimension
    ):
        return (
            f"Document '{label}' records {recorded_dimension}-dimensional vectors "
            f"but the active embedding model '{identity.model}' produces "
            f"{identity.dimension}-dimensional vectors. Delete the document and "
            f"re-upload it to rebuild the index."
        )

    return None
