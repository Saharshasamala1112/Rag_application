"""Conversation persistence service."""

from __future__ import annotations

import json
import logging
import os
import re
import tempfile
import threading
import time
import uuid
from pathlib import Path

from app.config.settings import settings

logger = logging.getLogger(__name__)
_CONVERSATION_ID_PATTERN = re.compile(r"^conv-[0-9a-f]{12}$")
_conversation_lock = threading.RLock()
MAX_CONVERSATION_MESSAGES = 200


def _conversations_dir() -> Path:
    d = settings.upload_dir / "conversations"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _conversation_path(conversation_id: str) -> Path:
    if not _CONVERSATION_ID_PATTERN.fullmatch(conversation_id):
        raise ValueError("Invalid conversation ID.")
    return _conversations_dir() / f"{conversation_id}.json"


def _load(conversation_id: str) -> dict | None:
    try:
        path = _conversation_path(conversation_id)
    except ValueError:
        return None
    with _conversation_lock:
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None


def _save(conversation_id: str, data: dict) -> None:
    path = _conversation_path(conversation_id)
    temporary_path: Path | None = None
    with _conversation_lock:
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=path.parent,
                prefix=f".{conversation_id}-",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                json.dump(data, temporary_file, indent=2, ensure_ascii=False)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_path, path)
        except Exception:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise


def create_conversation(title: str | None = None) -> dict:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cid = f"conv-{uuid.uuid4().hex[:12]}"
    data = {
        "conversation_id": cid,
        "title": title or "New conversation",
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }
    _save(cid, data)
    return data


def list_conversations() -> list[dict]:
    conv_dir = _conversations_dir()
    conversations = []
    with _conversation_lock:
        for path in sorted(conv_dir.glob("conv-*.json"), reverse=True):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                conversations.append({
                    "conversation_id": data["conversation_id"],
                    "title": data["title"],
                    "created_at": data["created_at"],
                    "updated_at": data["updated_at"],
                    "message_count": len(data.get("messages", [])),
                })
            except (json.JSONDecodeError, OSError, KeyError):
                continue
    return conversations


def get_conversation(conversation_id: str) -> dict | None:
    return _load(conversation_id)


def update_conversation_title(conversation_id: str, title: str) -> dict | None:
    with _conversation_lock:
        data = _load(conversation_id)
        if not data:
            return None
        data["title"] = title
        data["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _save(conversation_id, data)
        return data


def add_message(
    conversation_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None,
    interrupted: bool = False,
) -> dict | None:
    with _conversation_lock:
        data = _load(conversation_id)
        if not data:
            return None

        msg = {
            "role": role,
            "content": content,
            "sources": sources,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        if interrupted:
            msg["interrupted"] = True
        data["messages"].append(msg)
        if len(data["messages"]) > MAX_CONVERSATION_MESSAGES:
            del data["messages"][:-MAX_CONVERSATION_MESSAGES]
        data["updated_at"] = msg["created_at"]

        if role == "user" and len(data["messages"]) == 1:
            data["title"] = content[:80] + ("..." if len(content) > 80 else "")

        _save(conversation_id, data)
        return msg


def delete_conversation(conversation_id: str) -> bool:
    try:
        path = _conversation_path(conversation_id)
    except ValueError:
        return False
    with _conversation_lock:
        if path.exists():
            path.unlink()
            return True
        return False
