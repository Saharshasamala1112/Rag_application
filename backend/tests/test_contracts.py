from __future__ import annotations

import json
from pathlib import Path

from app.main import app


def test_openapi_schema_matches_the_committed_contract():
    schema_path = Path(__file__).resolve().parents[2] / "contracts" / "openapi.json"
    expected = json.loads(schema_path.read_text(encoding="utf-8"))

    assert app.openapi() == expected


def test_health_query_and_supported_type_schemas_are_explicit():
    schema = app.openapi()
    paths = schema["paths"]
    schemas = schema["components"]["schemas"]

    assert set(schemas["HealthResponse"]["properties"]) == {
        "status",
        "version",
        "model",
        "embedding_model",
        "ollama_available",
        "document_count",
    }
    assert set(schemas["QueryResponse"]["properties"]) == {
        "answer",
        "sources",
        "retrieval_time_ms",
        "generation_time_ms",
        "total_time_ms",
    }
    assert set(schemas["SupportedTypesResponse"]["properties"]) == {"types", "total"}
    assert set(schemas["SupportedFileType"]["properties"]) == {
        "extension",
        "description",
    }

    assert paths["/api/v1/health"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/HealthResponse"
    assert paths["/api/v1/query"]["post"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/QueryResponse"
    assert paths["/api/v1/upload/supported-types"]["get"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"] == (
        "#/components/schemas/SupportedTypesResponse"
    )
    assert "text/event-stream" in paths["/api/v1/query/stream"]["post"][
        "responses"
    ]["200"]["content"]

    score_schema = schemas["SourceChunk"]["properties"]["score"]
    assert score_schema["minimum"] == 0.0
    assert score_schema["maximum"] == 1.0


def test_successful_json_responses_are_pydantic_models():
    """Every 200 JSON response must come from a named Pydantic model (issue #48)."""
    schema = app.openapi()
    untyped: list[str] = []
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            content = operation.get("responses", {}).get("200", {}).get("content", {})
            if "application/json" not in content:
                continue
            response_schema = content["application/json"]["schema"]
            if "$ref" not in response_schema and "properties" not in response_schema:
                untyped.append(f"{method.upper()} {path}")
    assert untyped == []


def test_document_and_collection_response_schemas_are_named():
    schemas = app.openapi()["components"]["schemas"]
    for name in (
        "UploadResponse",
        "DocumentInfo",
        "DocumentStatusResponse",
        "DocumentPreviewResponse",
        "DocumentChunksResponse",
        "DocumentDeleteResponse",
        "ConversationDetail",
        "ConversationListResponse",
        "ConversationDeleteResponse",
        "CollectionResponse",
        "CollectionListResponse",
        "CollectionDeleteResponse",
    ):
        assert name in schemas
