from __future__ import annotations

import subprocess
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.config.settings import settings
from app.rag.document_loader import (
    DocumentLimitError,
    DocumentLoader,
    normalize_text,
)


class TestNormalizeText:
    def test_collapses_whitespace(self):
        assert normalize_text("hello   world") == "hello world"

    def test_collapses_newlines(self):
        assert normalize_text("a\n\n\n\nb") == "a\n\nb"

    def test_strips_trailing_whitespace(self):
        assert normalize_text("hello   \nworld  ") == "hello\nworld"

    def test_normalizes_unicode_dashes(self):
        result = normalize_text("one\u2013two\u2014three")
        assert "\u2013" not in result
        assert "\u2014" not in result
        assert "one-two" in result

    def test_normalizes_unicode_quotes(self):
        result = normalize_text("\u201cHello\u201d \u2018World\u2019")
        assert "\u201c" not in result
        assert "\u201d" not in result
        assert "\u2018" not in result
        assert "\u2019" not in result
        assert '"Hello"' in result
        assert "'World'" in result

    def test_strips_input(self):
        assert normalize_text("  hello  ") == "hello"

    def test_empty_string(self):
        assert normalize_text("") == ""

    def test_preserves_single_newlines(self):
        assert normalize_text("line1\nline2") == "line1\nline2"


class TestExtractText:
    def test_utf8_file(self, sample_txt: Path):
        result = DocumentLoader._extract_text(sample_txt)
        assert "test document" in result

    def test_latin1_fallback(self, tmp_dir: Path):
        p = tmp_dir / "latin1.txt"
        p.write_bytes(b"caf\xe9 is great")
        result = DocumentLoader._extract_text(p)
        assert "caf" in result

    def test_binary_fallback(self, tmp_dir: Path):
        p = tmp_dir / "binary.txt"
        p.write_bytes(b"\x00\x01\x02Hello\xfe\xffWorld")
        result = DocumentLoader._extract_text(p)
        assert "Hello" in result or "World" in result


class TestExtractCsv:
    def test_csv_to_markdown_table(self, sample_csv: Path):
        result = DocumentLoader._extract_csv(sample_csv)
        assert "| name | age | city |" in result
        assert "| Alice | 30 | NYC |" in result
        assert "| --- | --- | --- |" in result

    def test_empty_csv(self, tmp_dir: Path):
        p = tmp_dir / "empty.csv"
        p.write_text("")
        result = DocumentLoader._extract_csv(p)
        assert result == ""

    def test_csv_rejects_file_over_configured_parser_limit(self, tmp_path: Path):
        path = tmp_path / "large.csv"
        path.write_bytes(b"name\nvalue\n")

        with patch.object(settings, "max_tabular_file_mb", 1):
            with patch.object(Path, "stat") as stat:
                stat.return_value.st_size = 1024 * 1024 + 1
                with pytest.raises(DocumentLimitError, match="CSV file"):
                    DocumentLoader.extract_markdown(path)


class TestExtractJson:
    def test_json_formatted(self, sample_json: Path):
        result = DocumentLoader._extract_json(sample_json)
        assert '"key": "value"' in result
        assert "1" in result and "2" in result and "3" in result

    def test_invalid_json(self, tmp_dir: Path):
        p = tmp_dir / "bad.json"
        p.write_text("not valid json {{{")
        result = DocumentLoader._extract_json(p)
        assert "not valid json" in result

    def test_json_rejects_file_over_configured_parser_limit(self, tmp_path: Path):
        path = tmp_path / "large.json"
        path.write_bytes(b"{}")

        with patch.object(settings, "max_tabular_file_mb", 1):
            with patch.object(Path, "stat") as stat:
                stat.return_value.st_size = 1024 * 1024 + 1
                with pytest.raises(DocumentLimitError, match="JSON file"):
                    DocumentLoader.extract_markdown(path)


class TestDocumentParserLimits:
    def test_pdf_page_count_is_checked_before_markdown_parser(self, tmp_path: Path):
        path = tmp_path / "large.pdf"
        path.touch()
        pdf = MagicMock()
        pdf.page_count = 3
        pdf_context = MagicMock()
        pdf_context.__enter__.return_value = pdf

        with (
            patch("app.rag.document_loader.pymupdf.open", return_value=pdf_context),
            patch.object(settings, "max_pdf_pages", 2),
            patch("app.rag.document_loader.pymupdf4llm.to_markdown") as to_markdown,
        ):
            with pytest.raises(DocumentLimitError, match="2 page limit"):
                DocumentLoader.extract_markdown(path)

        to_markdown.assert_not_called()

    def test_docx_uncompressed_member_size_is_checked_before_parser(
        self, tmp_path: Path
    ):
        path = tmp_path / "large.docx"
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr(
                "word/document.xml",
                "<document>" + "x" * (1024 * 1024) + "</document>",
            )

        with patch.object(settings, "max_docx_xml_mb", 1):
            with patch(
                "app.rag.document_loader.DocumentLoader._extract_docx"
            ) as extract:
                with pytest.raises(DocumentLimitError, match="XML"):
                    DocumentLoader.extract_markdown(path)
        extract.assert_not_called()

    def test_external_parser_timeout_is_bounded(self, tmp_path: Path):
        path = tmp_path / "legacy.doc"
        path.write_bytes(b"\x00" * 100)
        timeout_error = subprocess.TimeoutExpired(
            cmd="antiword",
            timeout=3,
        )
        with patch.object(settings, "external_parser_timeout_seconds", 3):
            with patch(
                "app.rag.document_loader.subprocess.run",
                side_effect=[
                    timeout_error,
                    FileNotFoundError(),
                ],
            ) as run:
                with pytest.raises(ValueError, match="Cannot extract text"):
                    DocumentLoader._extract_doc_antiword(path)

        assert [call.kwargs["timeout"] for call in run.call_args_list] == [3, 3]

    def test_docx_archive_size_limit_prevents_parser_invocation(self, tmp_path: Path):
        path = tmp_path / "large.docx"
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr(
                "word/document.xml",
                "<document>" + "x" * (1024 * 1024) + "</document>",
            )

        with patch.object(settings, "max_docx_xml_mb", 2):
            with patch.object(settings, "max_document_archive_mb", 1):
                with pytest.raises(DocumentLimitError, match="archive"):
                    DocumentLoader.extract_markdown(path)


class TestExtractHtml:
    def test_strips_tags(self, sample_html: Path):
        result = DocumentLoader._extract_html(sample_html)
        assert "Hello" in result
        assert "This is a paragraph" in result
        assert "<script>" not in result

    def test_strips_scripts_and_styles(self, tmp_dir: Path):
        p = tmp_dir / "s.html"
        p.write_text("<html><body><p>Content</p><script>bad()</script><style>.x{}</style></body></html>")
        result = DocumentLoader._extract_html(p)
        assert "Content" in result
        assert "bad()" not in result


class TestExtractXml:
    def test_strips_xml_tags(self, sample_xml: Path):
        result = DocumentLoader._extract_xml(sample_xml)
        assert "Alpha" in result
        assert "Beta" in result
        assert "<root>" not in result


class TestExtractMarkdown:
    def test_md_file(self, sample_md: Path):
        result = DocumentLoader._extract_text(sample_md)
        assert "# Title" in result
        assert "## Section" in result
        assert "content under title" in result


class TestExtractCode:
    def test_python_file(self, sample_code: Path):
        result = DocumentLoader._extract_text(sample_code)
        assert "def hello():" in result
        assert "print" in result


class TestSupportedExtensions:
    def test_all_expected_types_present(self):
        from app.rag.document_loader import SUPPORTED_EXTENSIONS

        expected = [".pdf", ".txt", ".md", ".csv", ".json", ".html", ".py", ".js"]
        for ext in expected:
            assert ext in SUPPORTED_EXTENSIONS
