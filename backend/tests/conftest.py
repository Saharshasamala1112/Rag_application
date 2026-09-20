from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def tmp_dir() -> Generator[Path, None, None]:
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


@pytest.fixture()
def sample_txt(tmp_dir: Path) -> Path:
    p = tmp_dir / "sample.txt"
    p.write_text("This is a test document.\n\nIt has multiple paragraphs.\n\nThird paragraph here.")
    return p


@pytest.fixture()
def sample_md(tmp_dir: Path) -> Path:
    p = tmp_dir / "sample.md"
    p.write_text("# Title\n\nSome content under title.\n\n## Section\n\nMore content here.")
    return p


@pytest.fixture()
def sample_csv(tmp_dir: Path) -> Path:
    p = tmp_dir / "data.csv"
    p.write_text("name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago")
    return p


@pytest.fixture()
def sample_json(tmp_dir: Path) -> Path:
    p = tmp_dir / "data.json"
    json.dump({"key": "value", "items": [1, 2, 3]}, p.open("w"))
    return p


@pytest.fixture()
def sample_html(tmp_dir: Path) -> Path:
    p = tmp_dir / "page.html"
    p.write_text(
        "<html><head><title>Test</title></head>"
        "<body><h1>Hello</h1><p>This is a paragraph.</p>"
        "<script>var x = 1;</script></body></html>"
    )
    return p


@pytest.fixture()
def sample_xml(tmp_dir: Path) -> Path:
    p = tmp_dir / "data.xml"
    p.write_text("<root><item>Alpha</item><item>Beta</item></root>")
    return p


@pytest.fixture()
def sample_code(tmp_dir: Path) -> Path:
    p = tmp_dir / "main.py"
    p.write_text('def hello():\n    print("Hello, world!")\n\nhello()\n')
    return p


@pytest.fixture()
def duplicate_md(tmp_dir: Path) -> Path:
    """Markdown with duplicate sections for testing deduplication."""
    p = tmp_dir / "dup.md"
    p.write_text(
        "# Section A\n\nFirst paragraph of section A.\n\n"
        "# Section B\n\nFirst paragraph of section B.\n\n"
        "# Section A\n\nFirst paragraph of section A.\n\n"
    )
    return p


@pytest.fixture()
def large_txt(tmp_dir: Path) -> Path:
    """Large text file for testing context budget."""
    p = tmp_dir / "large.txt"
    text = "This is a sentence with enough words to fill the token budget. " * 200
    p.write_text(text)
    return p


@pytest.fixture()
def doc_with_pagebreaks(tmp_dir: Path) -> Path:
    """Text with form-feed page break characters."""
    p = tmp_dir / "pages.txt"
    p.write_text("Page one content.\x0cPage two content.\x0cPage three content.")
    return p


@pytest.fixture()
def unicode_txt(tmp_dir: Path) -> Path:
    """Text with unicode characters for testing normalize_text."""
    p = tmp_dir / "unicode.txt"
    p.write_text(
        "Smart quotes: \u201cHello\u201d and \u2018World\u2019\n"
        "Dashes: one\u2013two\u2014three\n"
        "Extra   spaces   here\n\n\n\n\n\nToo many newlines"
    )
    return p
