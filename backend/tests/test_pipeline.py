from pathlib import Path

import numpy as np

from app.models.document import DocumentChunk
from app.rag.pipeline import DocumentPipeline


def test_document_pipeline_writes_chunks_and_saves_embeddings(tmp_path: Path):
    document_dir = tmp_path / "document"
    document_dir.mkdir()
    file_path = document_dir / "example.txt"
    file_path.write_text("Extracted source text.", encoding="utf-8")
    chunk = DocumentChunk(
        chunk_id=0,
        document_id="document",
        source="example.txt",
        chunk_length=12,
        content="source text.",
    )

    class Loader:
        def extract_markdown(self, _path: Path) -> str:
            return "# Example\n\nsource text."

    class Chunker:
        def split(self, markdown: str, document_id: str, source: str) -> list[DocumentChunk]:
            assert markdown == "# Example\n\nsource text."
            assert document_id == "document"
            assert source == "example.txt"
            return [chunk]

    class Embeddings:
        model_name = "test/pipeline-model"
        revision = None
        dimension = 2

        def encode(self, texts: list[str]) -> np.ndarray:
            assert texts == ["source text."]
            return np.array([[1.0, 0.0]], dtype=np.float32)

    class VectorStore:
        def save(self, embeddings: np.ndarray, output_dir: Path) -> None:
            assert embeddings.shape == (1, 2)
            assert output_dir == document_dir

    pipeline = DocumentPipeline.__new__(DocumentPipeline)
    pipeline.loader = Loader()
    pipeline.chunker = Chunker()
    pipeline.embedding_service = Embeddings()
    pipeline.vector_store = VectorStore()

    result = pipeline.process(file_path)

    assert result["chunk_count"] == 1
    assert result["total_chars"] == len(chunk.content)
    assert (document_dir / "chunks.json").is_file()
