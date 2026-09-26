from __future__ import annotations

import bisect
import hashlib
import logging
import re

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config.settings import settings
from app.models.document import DocumentChunk

logger = logging.getLogger(__name__)


class DocumentChunker:
    """Intelligent chunking that preserves structure, deduplicates, and enriches metadata."""

    def __init__(
        self,
        chunk_size: int = settings.chunk_size,
        chunk_overlap: int = settings.chunk_overlap,
    ) -> None:
        self.chunk_overlap = chunk_overlap
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

    def _content_hash(self, text: str) -> str:
        """Compute a content hash for deduplication."""
        normalized = re.sub(r"\s+", " ", text.strip().lower())
        return hashlib.md5(normalized.encode()).hexdigest()

    def _extract_header(self, text: str) -> str | None:
        """Extract the nearest markdown header from a chunk."""
        match = re.search(r"^#{1,4}\s+(.+)$", text, re.MULTILINE)
        return match.group(1).strip() if match else None

    @staticmethod
    def _estimate_page(
        text: str,
        markdown: str,
        page_break_positions: list[int] | None = None,
        start_pos: int | None = None,
    ) -> int:
        """Estimate page number using precomputed form-feed positions."""
        if start_pos is None:
            start_pos = markdown.find(text) if text else 0
        if start_pos < 0:
            return 1
        if page_break_positions is None:
            page_break_positions = [
                index for index, character in enumerate(markdown) if character == "\x0c"
            ]
        return bisect.bisect_right(page_break_positions, start_pos) + 1

    def split(
        self,
        markdown: str,
        document_id: str,
        source: str,
    ) -> list[DocumentChunk]:
        """Split markdown into chunks with metadata and deduplication."""

        texts = self.splitter.split_text(markdown)

        chunks: list[DocumentChunk] = []
        seen_hashes: set[str] = set()
        search_pos = 0
        chunk_index = 0
        page_break_positions = [
            index for index, character in enumerate(markdown) if character == "\x0c"
        ]

        for text in texts:
            start_pos = markdown.find(text, search_pos)
            if start_pos == -1:
                logger.warning("Skipping chunk that could not be aligned to source text.")
                continue
            search_pos = max(start_pos + 1, start_pos + len(text) - self.chunk_overlap)

            # Deduplication: skip near-identical chunks
            h = self._content_hash(text)
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            end_pos = start_pos + len(text)

            header = self._extract_header(text)
            page = self._estimate_page(
                text,
                markdown,
                page_break_positions=page_break_positions,
                start_pos=start_pos,
            )

            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_index,
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

            chunk_index += 1

        return chunks
