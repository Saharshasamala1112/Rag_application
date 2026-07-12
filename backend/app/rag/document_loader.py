from __future__ import annotations

from pathlib import Path

import pymupdf4llm


class DocumentLoader:
    """Load and extract markdown from PDF documents."""

    @staticmethod
    def extract_markdown(
        pdf_path: Path,
    ) -> str:
        """
        Extract markdown from a PDF.

        Args:
            pdf_path: Path to the PDF.

        Returns:
            Markdown text.
        """

        return pymupdf4llm.to_markdown(
            str(pdf_path),
        )
