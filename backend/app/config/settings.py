from pathlib import Path

BASE_DIR = Path("data/uploads")

BASE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)
