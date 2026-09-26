from unittest.mock import patch

from app.config.settings import settings
from app.rag.llm import LocalLLM


def test_build_messages_includes_prior_conversation_turns():
    llm = LocalLLM.__new__(LocalLLM)
    history = [
        {"role": "user", "content": "What is the capital?"},
        {"role": "assistant", "content": "Paris."},
    ]

    messages = llm._build_messages(
        question="And its population?",
        context="The city has two million residents.",
        history=history,
    )

    assert [message["role"] for message in messages] == [
        "system",
        "user",
        "assistant",
        "user",
    ]
    assert messages[1:3] == history


def test_llm_initialization_does_not_resolve_a_remote_model():
    with patch("app.rag.llm.Client"), patch.object(
        type(settings),
        "resolve_model",
        side_effect=AssertionError("model resolution must remain lazy"),
    ):
        llm = LocalLLM()

    assert llm._model is None
