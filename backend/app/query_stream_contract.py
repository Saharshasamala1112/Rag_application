from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "query_stream.json"


class StreamStatus(TypedDict):
    text: str
    stage: str


with CONTRACT_PATH.open(encoding="utf-8") as contract_file:
    _CONTRACT = json.load(contract_file)

QUERY_STREAM_EVENTS: dict[str, str] = _CONTRACT["events"]
QUERY_STREAM_STATUSES: dict[str, StreamStatus] = _CONTRACT["statuses"]
QUERY_STREAM_TRACE_STEPS: tuple[str, ...] = tuple(_CONTRACT["trace_steps"])
