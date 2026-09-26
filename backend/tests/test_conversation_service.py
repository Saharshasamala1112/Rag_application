from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from app.config.settings import settings
from app.services import conversation_service


def test_concurrent_message_updates_preserve_every_message(tmp_path: Path):
    with patch.object(settings, "upload_dir", tmp_path):
        conversation = conversation_service.create_conversation()

        with ThreadPoolExecutor(max_workers=8) as executor:
            list(
                executor.map(
                    lambda index: conversation_service.add_message(
                        conversation["conversation_id"],
                        "user",
                        f"message-{index}",
                    ),
                    range(40),
                )
            )

        stored = conversation_service.get_conversation(conversation["conversation_id"])

    assert stored is not None
    assert len(stored["messages"]) == 40
    assert {message["content"] for message in stored["messages"]} == {
        f"message-{index}" for index in range(40)
    }
    assert not list((tmp_path / "conversations").glob("*.tmp"))


def test_invalid_conversation_ids_cannot_escape_storage(tmp_path: Path):
    outside = tmp_path / "outside.json"
    outside.write_text("{}")

    with patch.object(settings, "upload_dir", tmp_path):
        assert conversation_service.get_conversation("../../outside") is None
        assert conversation_service.add_message("../../outside", "user", "text") is None
        assert not conversation_service.delete_conversation("../../outside")

    assert outside.read_text() == "{}"


def test_interrupted_assistant_message_is_persisted(tmp_path: Path):
    with patch.object(settings, "upload_dir", tmp_path):
        conversation = conversation_service.create_conversation()
        message = conversation_service.add_message(
            conversation["conversation_id"],
            "assistant",
            "partial response",
            interrupted=True,
        )
        stored = conversation_service.get_conversation(conversation["conversation_id"])

    assert message is not None
    assert message["interrupted"] is True
    assert stored is not None
    assert stored["messages"][0]["interrupted"] is True


def test_conversation_history_is_bounded(tmp_path: Path):
    with (
        patch.object(settings, "upload_dir", tmp_path),
        patch.object(settings, "max_conversation_messages", 2),
    ):
        conversation = conversation_service.create_conversation()
        for index in range(settings.max_conversation_messages + 1):
            conversation_service.add_message(
                conversation["conversation_id"],
                "user",
                f"message-{index}",
            )
        stored = conversation_service.get_conversation(conversation["conversation_id"])

    assert stored is not None
    messages = stored["messages"]
    assert len(messages) == 2
    assert messages[0]["content"] == "message-1"
    assert messages[-1]["content"] == "message-2"


def test_conversation_list_cache_invalidates_after_changes(tmp_path: Path):
    with patch.object(settings, "upload_dir", tmp_path):
        first = conversation_service.create_conversation()
        cached = conversation_service.list_conversations()
        cached[0]["title"] = "mutated response"

        second = conversation_service.create_conversation()
        updated = conversation_service.list_conversations()

    assert len(updated) == 2
    assert {item["conversation_id"] for item in updated} == {
        first["conversation_id"],
        second["conversation_id"],
    }
    assert all(item["title"] != "mutated response" for item in updated)
