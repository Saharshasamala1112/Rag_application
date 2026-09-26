from unittest.mock import MagicMock, patch

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


def test_generate_returns_trimmed_content_from_ollama():
    llm = LocalLLM.__new__(LocalLLM)
    llm._model = "test-model"
    llm.client = MagicMock()
    llm.client.chat.return_value = {"message": {"content": "  Answer  "}}
    answer = llm.generate("question", "context")

    assert answer == "Answer"


def test_generate_stream_yields_tokens_in_order():
    llm = LocalLLM.__new__(LocalLLM)
    llm._model = "test-model"
    llm.client = MagicMock()
    llm.client.chat.return_value = [
        {"message": {"content": "one"}},
        {"message": {"content": " two"}},
    ]
    tokens = list(llm.generate_stream("question", "context"))

    assert tokens == ["one", " two"]
