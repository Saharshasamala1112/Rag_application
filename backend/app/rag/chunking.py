from __future__ import annotations

import re

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config.settings import settings
from app.models.document import DocumentChunk


class DocumentChunker:
    """Intelligent chunking that preserves structure and metadata."""

    def __init__(
        self,
        chunk_size: int = settings.chunk_size,
        chunk_overlap: int = settings.chunk_overlap,
    ) -> None:
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n# ",
                "\n## ",
                "\n### ",
                "\n#### ",
                "\n\n",
                "\n",
                ". ",
                " ",
                "",
            ],
            length_function=len,
        )

    def _extract_header(self, text: str) -> str | None:
        """Extract the nearest markdown header from a chunk."""
        match = re.search(r"^#{1,4}\s+(.+)$", text, re.MULTILINE)
        return match.group(1).strip() if match else None

    def _estimate_page(self, text: str, markdown: str) -> int:
        """Estimate page number from position in the original markdown."""
        char_pos = markdown.find(text[:50]) if text else 0
        if char_pos == -1:
            char_pos = 0
        page_breaks = markdown[:char_pos].count("\x0c")
        return page_breaks + 1

    def split(
        self,
        markdown: str,
        document_id: str,
        source: str,
    ) -> list[DocumentChunk]:
        """Split markdown into chunks with metadata."""

        texts = self.splitter.split_text(markdown)

        chunks: list[DocumentChunk] = []
        current_pos = 0

        for index, text in enumerate(texts):
            start_pos = markdown.find(text[:80], current_pos)
            if start_pos == -1:
                start_pos = current_pos
            end_pos = start_pos + len(text)

            header = self._extract_header(text)
            page = self._estimate_page(text, markdown)

            chunks.append(
                DocumentChunk(
                    chunk_id=index,
                    document_id=document_id,
                    source=source,
                    chunk_length=len(text),
                    content=text,
                    page_number=page,
                    header=header,
                    start_pos=start_pos,
                    end_pos=end_pos,
                )
            )

            current_pos = end_pos

        return chunks
