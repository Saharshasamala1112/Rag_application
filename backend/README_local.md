# Local RAG Backend

Production-ready Local Retrieval Augmented Generation backend built using FastAPI.

---

## Features

- Local document ingestion (PDF, DOCX, TXT, Markdown, CSV, JSON, HTML, code files)
- Markdown extraction
- Smart chunking
- SentenceTransformer embeddings
- FAISS vector search
- Ollama LLM
- Source citations
- FastAPI REST API

---

## Stack

- FastAPI
- PyMuPDF4LLM
- langchain-text-splitters
- Sentence Transformers
- FAISS
- Ollama
- Ruff
- Pytest

---

## Installation

Create virtual environment

```bash
python3 -m venv .venv
```

Activate

```bash
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

The requirements file installs the development tools and model dependencies.
For a locked environment, use `uv sync --frozen --extra dev --extra models`
(this is what CI runs, minus the `models` extra).

Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Swagger

```
http://localhost:8002/docs
```

---

## API

Every route lives under `/api/v1` and requires the `X-API-Key` header set from
`.env` (`API_KEY`); the health probes are exempt.

### Upload a document

```
POST /api/v1/upload
```

### Query

```
POST /api/v1/query
```

### Health

```
GET /api/v1/health
```

See the root `README.md` for the full endpoint table.
