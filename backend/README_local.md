# Local RAG Backend

Production-ready Local Retrieval Augmented Generation backend built using FastAPI.

---

## Features

- Local PDF ingestion
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
- LangChain
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
For a locked environment, use `uv sync --locked --extra dev --extra models`.

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

### Upload PDF

```
POST /upload
```

### Query

```
POST /query
```

### Health

```
GET /health
```