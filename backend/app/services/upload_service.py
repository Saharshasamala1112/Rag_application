from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.rag.pipeline import DocumentPipeline
from app.utils.file_utils import save_upload_file


class UploadService:
    """Handle PDF uploads."""

    def __init__(self) -> None:
        self.pipeline = DocumentPipeline()

    async def save_pdf(
        self,
        file: UploadFile,
    ) -> tuple[str, Path]:
        """Save a PDF and process it."""

        document_id = str(uuid.uuid4())

        output_dir = Path("data/uploads") / document_id
        output_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        pdf_path = output_dir / "original.pdf"

        save_upload_file(
            file=file,
            destination=pdf_path,
        )

        self.pipeline.process(pdf_path)

        return (
            document_id,
            pdf_path,
        )
