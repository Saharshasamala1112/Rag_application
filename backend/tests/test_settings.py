from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.config.settings import Settings


def test_server_binds_to_loopback_by_default():
    assert Settings().host == "127.0.0.1"


def test_wildcard_cors_rejects_credentials():
    with pytest.raises(ValidationError, match="wildcard origin"):
        Settings(cors_origins=["*"], cors_allow_credentials=True)


def test_wildcard_cors_is_allowed_without_credentials():
    settings = Settings(cors_origins=["*"], cors_allow_credentials=False)
    assert settings.cors_origins == ["*"]


def test_reranker_threshold_must_be_a_probability():
    assert Settings(reranker_min_score=0.15).reranker_min_score == 0.15
    with pytest.raises(ValidationError, match="between 0 and 1"):
        Settings(reranker_min_score=1.1)


def test_ollama_model_list_uses_the_configured_ttl_cache():
    settings = Settings()
    settings._available_models = None
    response = MagicMock()
    response.models = [MagicMock(model="llama3.2:latest")]
    ollama_client = MagicMock()
    ollama_client.list.return_value = response

    with patch("ollama.Client", return_value=ollama_client):
        assert settings.get_available_ollama_models() == ["llama3.2:latest"]
        assert settings.get_available_ollama_models() == ["llama3.2:latest"]
        settings.get_available_ollama_models(force_refresh=True)

    assert ollama_client.list.call_count == 2
