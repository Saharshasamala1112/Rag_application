import json
from pathlib import Path


def save_metadata(output_dir: Path, data: dict) -> None:
    """Save metadata to metadata.json."""

    with (output_dir / "metadata.json").open(
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            data,
            f,
            indent=4,
        )
