from __future__ import annotations

import json
import csv
import io
from pathlib import Path

import pymupdf4llm


SUPPORTED_EXTENSIONS = {
    ".pdf": "PDF Document",
    ".txt": "Plain Text",
    ".md": "Markdown",
    ".csv": "CSV Spreadsheet",
    ".json": "JSON Data",
    ".html": "HTML Document",
    ".htm": "HTML Document",
    ".xml": "XML Document",
    ".log": "Log File",
    ".py": "Python Source",
    ".js": "JavaScript Source",
    ".ts": "TypeScript Source",
    ".java": "Java Source",
    ".c": "C Source",
    ".cpp": "C++ Source",
    ".go": "Go Source",
    ".rs": "Rust Source",
    ".rb": "Ruby Source",
    ".php": "PHP Source",
    ".sh": "Shell Script",
    ".yaml": "YAML Config",
    ".yml": "YAML Config",
    ".toml": "TOML Config",
    ".ini": "INI Config",
    ".cfg": "Config File",
    ".conf": "Config File",
    ".sql": "SQL Query",
    ".r": "R Source",
    ".swift": "Swift Source",
    ".kt": "Kotlin Source",
    ".scala": "Scala Source",
    ".tex": "LaTeX Document",
    ".bib": "BibTeX Data",
    ".rtf": "Rich Text Format",
}


class DocumentLoader:
    """Load and extract markdown from various document formats."""

    @staticmethod
    def extract_markdown(file_path: Path) -> str:
        """Extract markdown text from a supported file format."""

        suffix = file_path.suffix.lower()

        if suffix == ".pdf":
            return pymupdf4llm.to_markdown(str(file_path))

        if suffix == ".csv":
            return DocumentLoader._extract_csv(file_path)

        if suffix == ".json":
            return DocumentLoader._extract_json(file_path)

        if suffix in (".html", ".htm"):
            return DocumentLoader._extract_html(file_path)

        if suffix == ".xml":
            return DocumentLoader._extract_xml(file_path)

        if suffix == ".rtf":
            return DocumentLoader._extract_rtf(file_path)

        # Plain text and all code/config formats
        return DocumentLoader._extract_text(file_path)

    @staticmethod
    def _extract_text(file_path: Path) -> str:
        """Extract text from plain text files."""
        try:
            return file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                return file_path.read_text(encoding="latin-1")
            except Exception:
                return file_path.read_text(encoding="utf-8", errors="replace")

    @staticmethod
    def _extract_csv(file_path: Path) -> str:
        """Extract markdown table from CSV."""
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file_path.read_text(encoding="latin-1")

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return ""

        lines = []
        # Header
        header = rows[0]
        lines.append("| " + " | ".join(header) + " |")
        lines.append("| " + " | ".join(["---"] * len(header)) + " |")

        # Data rows (limit to 500 rows for readability)
        for row in rows[1:501]:
            # Pad rows to match header length
            padded = row + [""] * (len(header) - len(row))
            lines.append("| " + " | ".join(padded[: len(header)]) + " |")

        if len(rows) > 501:
            lines.append(f"\n*... {len(rows) - 501} more rows*")

        return "\n".join(lines)

    @staticmethod
    def _extract_json(file_path: Path) -> str:
        """Extract readable text from JSON."""
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file_path.read_text(encoding="latin-1")

        try:
            data = json.loads(text)
            return json.dumps(data, indent=2, ensure_ascii=False)
        except json.JSONDecodeError:
            return text

    @staticmethod
    def _extract_html(file_path: Path) -> str:
        """Extract text from HTML, stripping tags."""
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file_path.read_text(encoding="latin-1")

        # Simple tag removal - preserve text content
        import re
        # Remove script and style blocks
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        # Convert common block elements to newlines
        text = re.sub(r"<(?:br|p|div|h[1-6]|li|tr)[^>]*/?>", "\n", text, flags=re.IGNORECASE)
        # Remove remaining tags
        text = re.sub(r"<[^>]+>", "", text)
        # Decode common entities
        text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        text = text.replace("&nbsp;", " ").replace("&quot;", '"')
        # Clean up whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def _extract_xml(file_path: Path) -> str:
        """Extract text from XML."""
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file_path.read_text(encoding="latin-1")
        # Similar to HTML but preserve structure
        import re
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    @staticmethod
    def _extract_rtf(file_path: Path) -> str:
        """Basic RTF text extraction."""
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file_path.read_text(encoding="latin-1")

        import re
        # Remove RTF control words
        text = re.sub(r"\\[a-zA-Z]+\d*\s?", "", text)
        # Remove RTF groups
        text = text.replace("{", "").replace("}", "")
        # Remove remaining escape sequences
        text = re.sub(r"\\['\"]", "", text)
        return text.strip()
