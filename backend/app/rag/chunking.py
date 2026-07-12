from __future__ import annotations

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.document import DocumentChunk


class DocumentChunker:
    """Split markdown into chunks."""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ) -> None:
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n## ",
                "\n### ",
                "\n#### ",
                "\n\n",
                "\n",
                ". ",
                " ",
                "",
            ],
        )

    def split(
        self,
        markdown: str,
        document_id: str,
        source: str,
    ) -> list[DocumentChunk]:
        """Split markdown into chunks."""

        texts = self.splitter.split_text(markdown)

        chunks: list[DocumentChunk] = []

        for index, text in enumerate(texts):
            chunks.append(
                DocumentChunk(
                    chunk_id=index,
                    document_id=document_id,
                    source=source,
                    chunk_length=len(text),
                    content=text,
                )
            )

        return chunks
