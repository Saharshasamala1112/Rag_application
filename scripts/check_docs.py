#!/usr/bin/env python3
"""Verify documentation claims against the repository.

Run from the repository root: ``python scripts/check_docs.py`` (stdlib only).

Checks:
1. File paths referenced in the markdown docs exist in the repository
   (project-structure trees and inline code spans).
2. The API endpoint table in README.md matches ``contracts/openapi.json``
   exactly (methods and paths).

Exit status is 0 when every check passes, 1 otherwise.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DOCS = [
    ROOT / "README.md",
    ROOT / "ARCHITECTURE.md",
    ROOT / "frontend" / "README.md",
    ROOT / "backend" / "README_local.md",
]

# Virtual top-level folder name in the README tree (the repo itself).
VIRTUAL_ROOTS = {"rag_application"}

# Tree subtrees that are generated at runtime and never present in a checkout.
RUNTIME_DIRS = {"data", ".venv", "node_modules", "dist", "coverage", "__pycache__"}

# Runtime artifacts that the backend writes under data/uploads/ (never in a
# checkout). They are validated against string literals in backend/app instead.
RUNTIME_ARTIFACTS = {"chunks.json", "faiss.index", "document_info.json"}

# Single-file references that are intentionally absent from a fresh checkout
# (gitignored config) or produced at runtime / by CI.
SKIP_BASENAMES = {
    ".env",
    ".venv",
    "coverage.xml",
    "junit.xml",
}

# Directory prefixes that never exist in a clean CI checkout.
SKIP_PREFIXES = (
    ".venv/",
    "node_modules/",
    "dist/",
    "coverage/",
    "data/",
    "__pycache__/",
    ".git/",
)

# Extensionless repo files that docs may reference by bare name.
PATHLESS_FILES = {"Dockerfile", "Makefile", "LICENSE", "Procfile"}

# Route paths FastAPI serves outside the OpenAPI document: the HTML/JSON
# helpers plus /metrics (declared with include_in_schema=False in app/main.py).
NON_OPENAPI_ROUTES = {"/docs", "/redoc", "/openapi.json", "/metrics"}

INLINE_CODE = re.compile(r"`([^`\s]+)`")
TREE_ENTRY = re.compile(r"^(?P<pre>.*?[├└]──\s)(?P<name>\S+)(?P<rest>.*)$")
TREE_LABEL = re.compile(r"^(?P<name>[^\s/]+(?:/[^\s/]+)*/)\s*$")
TABLE_ROW = re.compile(
    r"^\|\s*(?P<method>GET|POST|PATCH|DELETE|PUT)\s*\|\s*`(?P<path>[^`]+)`\s*\|"
)
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}

path_errors: list[str] = []
api_errors: list[str] = []


def _skip(token: str) -> bool:
    """Return True for URL paths, commands, placeholders, and runtime files."""
    if token.startswith(("http://", "https://", "/")) or "://" in token:
        return True
    if any(ch in token for ch in "{}*$=:@ \t"):
        return True
    # IP addresses and bare version numbers, e.g. "127.0.0.1".
    if re.fullmatch(r"\d+(\.\d+)*", token):
        return True
    if any(token.startswith(prefix) for prefix in SKIP_PREFIXES):
        return True
    if token.rstrip("/").split("/")[-1] in SKIP_BASENAMES:
        return True
    return False


_STRING_LITERAL = re.compile(r"""['"]([^'"\n]+)['"]""")
_LITERAL_CACHE: set[str] | None = None


def _backend_literals() -> set[str]:
    """String literals used in backend/app (filenames the code really writes)."""
    global _LITERAL_CACHE
    if _LITERAL_CACHE is None:
        literals: set[str] = set()
        for py_file in (ROOT / "backend" / "app").rglob("*.py"):
            literals.update(
                _STRING_LITERAL.findall(py_file.read_text(encoding="utf-8"))
            )
        _LITERAL_CACHE = literals
    return _LITERAL_CACHE


def _looks_like_path(token: str) -> bool:
    if "/" in token:
        return True
    if token in PATHLESS_FILES:
        return True
    # A single path segment with an extension, e.g. ".gitlab-ci.yml".
    return "." in token and re.fullmatch(r"[\w.-]+", token) is not None


def _resolve(token: str, doc: Path) -> Path | None:
    """Return an existing location for ``token``, or None if it is missing."""
    bare = token.rstrip("/")
    if "/" in bare:
        first, _, rest = bare.partition("/")
        anchors = [
            anchor for anchor in (ROOT / first, doc.parent / first) if anchor.is_dir()
        ]
        if not anchors:
            return None
        for anchor in anchors:
            if rest and (anchor / rest).exists():
                return anchor / rest
        return None
    candidates = [ROOT / bare, doc.parent / bare]
    # Single-segment file names are also looked up in the app directories.
    candidates += [ROOT / "backend" / bare, ROOT / "frontend" / bare]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _is_repo_path(token: str, doc: Path) -> bool:
    """False for identifiers that merely look path-like (model IDs, ...)."""
    if "/" not in token:
        return True
    first = token.rstrip("/").partition("/")[0]
    return (ROOT / first).exists() or (doc.parent / first).exists()


def _check_path(token: str, doc: Path, where: str) -> None:
    if _skip(token) or not _looks_like_path(token):
        return
    bare = token.rstrip("/")
    if bare.split("/")[-1] in RUNTIME_ARTIFACTS:
        # e.g. "chunks.json": must be a filename the backend actually writes.
        if bare not in _backend_literals():
            rel = doc.relative_to(ROOT)
            path_errors.append(
                f"{rel} {where}: not produced by backend/app source: {token}"
            )
        return
    if not _is_repo_path(token, doc):
        return
    if _resolve(token, doc) is None:
        rel = doc.relative_to(ROOT)
        path_errors.append(f"{rel} {where}: referenced path does not exist: {token}")


def _check_trees(doc: Path, text: str) -> None:
    """Validate file/dir entries inside fenced code blocks (structure trees)."""
    in_fence = False
    labeled = False
    stack: list[str] = []
    for line in text.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            if not in_fence:
                stack, labeled = [], False
            continue
        if not in_fence:
            continue
        match = TREE_ENTRY.match(line)
        if not match:
            label = TREE_LABEL.match(line)
            if label:
                # Root label of the tree, e.g. "data/uploads/".
                stack, labeled = [label.group("name").rstrip("/")], True
            continue
        depth = len(match.group("pre")) // 4 - 1 + (1 if labeled else 0)
        name = match.group("name").rstrip("/")
        stack = stack[:depth]
        # Placeholders ({document_id}, *.ext) and runtime subtrees (data/) are
        # layout documentation, not paths in a checkout.
        parts = [part for part in stack if part not in VIRTUAL_ROOTS]
        runtime = any(
            segment in RUNTIME_DIRS
            for part in [name, *stack]
            if part
            for segment in part.split("/")
        )
        placeholder = any(ch in part for ch in "{}*" for part in [name, *stack])
        if runtime or placeholder:
            # Inside a runtime/parameterised layout only the leaf file name is
            # checkable: it must be a string literal the backend really writes
            # (this is what catches wrong names such as "index.faiss").
            if "." in name and not any(ch in name for ch in "{}*"):
                if name not in _backend_literals():
                    rel = doc.relative_to(ROOT)
                    path_errors.append(
                        f"{rel}: tree entry not produced by backend/app source: "
                        f"{name}"
                    )
        else:
            relative = "/".join(parts + [name])
            if _resolve(relative, doc) is None:
                rel = doc.relative_to(ROOT)
                path_errors.append(f"{rel}: tree entry does not exist: {relative}")
        stack = stack[:depth] + [name]


def _check_inline_code(doc: Path, text: str) -> None:
    where = "references"
    for token in INLINE_CODE.findall(text):
        _check_path(token, doc, where)


def _normalize(path: str) -> str:
    return re.sub(r"\{[^}]*\}", "{}", path)


def _check_api_table() -> None:
    readme = ROOT / "README.md"
    documented: dict[str, set[str]] = {}
    for line in readme.read_text(encoding="utf-8").splitlines():
        match = TABLE_ROW.match(line)
        if not match:
            continue
        path = _normalize(match.group("path"))
        documented.setdefault(path, set()).add(match.group("method").upper())

    spec = json.loads((ROOT / "contracts" / "openapi.json").read_text(encoding="utf-8"))
    expected: dict[str, set[str]] = {}
    for path, operations in spec["paths"].items():
        methods = {m.upper() for m in operations if m.lower() in HTTP_METHODS}
        if methods:
            expected.setdefault(_normalize(path), set()).update(methods)

    for path, methods in sorted(expected.items()):
        missing = methods - documented.get(path, set())
        if path not in documented:
            api_errors.append(f"README.md API table: missing endpoint {path}")
        elif missing:
            api_errors.append(
                f"README.md API table: {path} missing method(s) "
                f"{', '.join(sorted(missing))}"
            )
    for path, methods in sorted(documented.items()):
        if path in expected:
            extra = methods - expected[path]
            if extra:
                api_errors.append(
                    f"README.md API table: {path} lists unknown method(s) "
                    f"{', '.join(sorted(extra))}"
                )
        elif path not in NON_OPENAPI_ROUTES:
            api_errors.append(
                f"README.md API table: endpoint not in contracts/openapi.json: {path}"
            )


def main() -> int:
    for doc in DOCS:
        text = doc.read_text(encoding="utf-8")
        _check_trees(doc, text)
        _check_inline_code(doc, text)
    _check_api_table()

    for message in path_errors + api_errors:
        print(f"ERROR: {message}")
    if path_errors or api_errors:
        print(
            f"\ndoc check failed: {len(path_errors)} path error(s), "
            f"{len(api_errors)} API table error(s)"
        )
        return 1
    print(f"doc check passed ({len(DOCS)} docs, README API table matches openapi)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
