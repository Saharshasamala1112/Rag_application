import shutil
from pathlib import Path


def save_upload_file(file, destination: Path) -> None:
    """Save an uploaded file to disk."""

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
