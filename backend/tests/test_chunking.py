from __future__ import annotations

from pathlib import Path

from app.rag.chunking import DocumentChunker


class TestDocumentChunker:
    def test_split_returns_chunks(self, sample_txt: Path):
        md = sample_txt.read_text()
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=50)
        chunks = chunker.split(md, document_id="doc1", source="sample.txt")
        assert len(chunks) >= 1

    def test_chunk_ids_sequential(self, sample_txt: Path):
        md = sample_txt.read_text()
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=50)
        chunks = chunker.split(md, document_id="doc1", source="sample.txt")
        ids = [c.chunk_id for c in chunks]
        assert ids == list(range(len(chunks)))

    def test_chunk_has_document_id(self, sample_txt: Path):
        md = sample_txt.read_text()
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=50)
        chunks = chunker.split(md, document_id="mydoc", source="sample.txt")
        for c in chunks:
            assert c.document_id == "mydoc"

    def test_chunk_has_source(self, sample_md: Path):
        md = sample_md.read_text()
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=50)
        chunks = chunker.split(md, document_id="doc1", source="sample.md")
        for c in chunks:
            assert c.source == "sample.md"

    def test_content_hash_dedup(self):
        chunker = DocumentChunker()
        h1 = chunker._content_hash("Hello World")
        h2 = chunker._content_hash("Hello   World")  # extra spaces
        h3 = chunker._content_hash("Different text")
        # normalized: "hello world" should produce same hash
        assert h1 == h2
        assert h1 != h3

    def test_extract_header_finds_h1(self):
        chunker = DocumentChunker()
        assert chunker._extract_header("# My Title") == "My Title"

    def test_extract_header_finds_h2(self):
        chunker = DocumentChunker()
        assert chunker._extract_header("## Sub Section") == "Sub Section"

    def test_extract_header_returns_none_for_no_header(self):
        chunker = DocumentChunker()
        assert chunker._extract_header("Just plain text no header here.") is None

    def test_estimate_page_no_breaks(self):
        chunker = DocumentChunker()
        page = chunker._estimate_page("hello", "hello world")
        assert page == 1

    def test_estimate_page_with_breaks(self):
        chunker = DocumentChunker()
        md = "Page 1.\x0cPage 2.\x0cPage 3. Start of page 3."
        page = chunker._estimate_page("Start of page 3", md)
        assert page == 3

    def test_dedup_removes_duplicate_chunks(self, duplicate_md: Path):
        md = duplicate_md.read_text()
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        chunks = chunker.split(md, document_id="doc1", source="dup.md")
        contents = [c.content.strip().lower() for c in chunks]
        # Each chunk content should be unique after dedup
        assert len(contents) == len(set(contents))

    def test_duplicate_content_is_kept_across_documents(self):
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=20)
        content = "A paragraph shared by independent documents."

        first = chunker.split(content, document_id="first", source="first.txt")
        second = chunker.split(content, document_id="second", source="second.txt")

        assert len(first) == len(second) == 1
        assert first[0].document_id == "first"
        assert second[0].document_id == "second"

    def test_large_document_many_chunks(self, large_txt: Path):
        md = large_txt.read_text()
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=50)
        chunks = chunker.split(md, document_id="doc1", source="large.txt")
        assert len(chunks) > 1

    def test_chunk_offsets_align_with_source_and_progress_through_overlaps(self):
        markdown = "First paragraph. " * 20
        chunks = DocumentChunker(chunk_size=40, chunk_overlap=10).split(
            markdown,
            document_id="doc1",
            source="repeat.txt",
        )

        assert len(chunks) > 1
        assert all(
            markdown[chunk.start_pos : chunk.end_pos] == chunk.content
            for chunk in chunks
        )
        assert all(len(chunk.content) <= 40 for chunk in chunks)
        assert [chunk.start_pos for chunk in chunks] == sorted(
            chunk.start_pos for chunk in chunks
        )

    def test_pagebreaks_estimated(self, doc_with_pagebreaks: Path):
        md = doc_with_pagebreaks.read_text()
        chunker = DocumentChunker(chunk_size=500, chunk_overlap=50)
        chunks = chunker.split(md, document_id="doc1", source="pages.txt")
        # Small doc fits in one chunk, but page estimate should still work
        assert len(chunks) >= 1
        # The chunk should have content from the document
        assert "Page one content" in chunks[0].content
