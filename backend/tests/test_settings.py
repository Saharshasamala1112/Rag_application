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
