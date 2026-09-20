from __future__ import annotations

from pathlib import Path

from app.rag.document_loader import DocumentLoader, normalize_text


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
