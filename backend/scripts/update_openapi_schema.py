from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.main import app

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "contracts" / "openapi.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    schema = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
    if args.check:
        if not SCHEMA_PATH.is_file() or SCHEMA_PATH.read_text(encoding="utf-8") != schema:
            print(
                "FastAPI OpenAPI schema differs from contracts/openapi.json; "
                "run `uv run python scripts/update_openapi_schema.py`.",
                file=sys.stderr,
            )
            return 1
        return 0

    SCHEMA_PATH.write_text(schema, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
