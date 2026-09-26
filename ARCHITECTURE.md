# DocuChat Architecture

## Overview

DocuChat is a local-first RAG (Retrieval-Augmented Generation) document workspace. The architecture prioritizes correctness, local operation, and production-grade retrieval quality over scale.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | FastAPI + async | Native async for streaming SSE, Pydantic for contract enforcement, fast iteration |
| Vector store | FAISS (IndexFlatIP) | Single-user/local deployment. In-memory search is fast for <100K chunks. No external service needed. |
| Embeddings | `BAAI/bge-small-en-v1.5` (384d) | Best quality-per-parameter ratio for general English text. Small enough for local CPU inference. The model name is configurable via `EMBEDDING_MODEL`; changing it changes the embedding space and requires rebuilding all document indexes. |
| Sparse retrieval | BM25 (custom scorer) | Complements dense retrieval for keyword-heavy queries. No external index needed. |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Highest-leverage quality lever. Cross-encoders outperform bi-encoders for pairwise relevance. |
| LLM | Ollama (`llama3.2:latest`) | Local inference, no API keys, no data leaves the machine. Configurable via env. |
| Frontend | React 19 + TypeScript + Vite | Fast dev, type safety, modern tooling. |
| State | Zustand | Minimal, no boilerplate, localStorage persistence for sessions. |
| Styling | Tailwind CSS + @tailwindcss/typography | Consistent design tokens, dark mode, prose rendering for markdown. |

## Retrieval Pipeline

```
Query → Dense (FAISS) + Sparse (BM25) → Reciprocal Rank Fusion → Dedup → Cross-Encoder Rerank → Context Build → LLM
```

1. **Dense retrieval**: FAISS inner-product search over BAAI/bge-small-en-v1.5 embeddings
2. **Sparse retrieval**: BM25 with IDF weighting over the same chunk corpus
3. **RRF fusion**: Reciprocal Rank Fusion (k=60) merges both rankings without score normalization
4. **Deduplication**: Content-hash based dedup removes near-identical chunks
5. **Reranking**: Cross-encoder scores query-chunk pairs for final relevance ranking
6. **Context assembly**: Top-k chunks with metadata, respecting the `MAX_CONTEXT_TOKENS`
   budget (1,500 tokens by default)
7. **Generation**: Ollama with strict document-grounded prompting, streaming via SSE

Queries linked to a server conversation include up to 12 preceding user/assistant messages
(maximum 4,000 characters each) in the generation prompt. Retrieval still runs against
the current question and selected document scope; conversation history is prompt context,
not a query-rewriting or retrieval-expansion stage.

Uploads progress through `uploading → processing → ready | failed`. The FAISS index is
written atomically before `chunks.json` is published; startup reconciliation marks
interrupted or inconsistent documents as failed, and retrieval excludes documents that
do not have a complete searchable index.

## Data Storage

All data lives in `data/uploads/`:

```
data/uploads/
├── {document_id}/
│   ├── original.{ext}        # Uploaded file
│   ├── document_info.json    # Metadata + uploading/processing/ready/failed state
│   ├── chunks.json           # Extracted chunks, atomically published after indexing
│   └── faiss.index           # FAISS vector index
├── conversations/
│   ├── {conversation_id}.json  # Conversation metadata + messages
```

### Why FAISS over pgvector/Qdrant

- **Local-first**: No database server to manage
- **Fast enough**: <100K chunks search in <10ms on CPU
- **Simple**: No connection pools, no migrations, no Docker dependency
- **Trade-off**: A large collection means many per-document index files; each is loaded lazily from disk on first use instead of being rebuilt at startup

### Why not pgvector/Qdrant

Would be the right choice for multi-user or large-scale deployment. For a single-user local tool, the operational overhead isn't justified.

## API Design

- All endpoints under `/api/v1` prefix
- All `/api/v1` endpoints require `X-API-Key`, except the `/api/v1/health` probe family; the key is read from `API_KEY`
- The default bind address is loopback (`127.0.0.1`); binding to a network interface is an explicit deployment choice
- Swagger, ReDoc, and OpenAPI are disabled when `ENV=production`
- CORS credentials cannot be combined with a wildcard origin
- Typed Pydantic models for every request/response
- SSE streaming for chat (never buffer full response)
- Request bodies are capped at the configured upload limit plus multipart overhead; uploaded files are copied to disk in bounded chunks and text uploads have the same file-size limit
- Error responses: `{"detail": "Human-readable message", "type": "error_code"}`
- Request ID middleware for tracing, JSON logs in production, and Prometheus-compatible request counters/durations at `/metrics`

## Concurrency Model

The default deployment is a single Uvicorn process. Synchronous upload handlers run in
Starlette's bounded AnyIO worker thread pool, keeping document parsing, chunking, and
embedding off the event loop. SSE iteration advances the synchronous retrieval and
generation pipeline through the same worker pool, so concurrent health and API requests
remain responsive. The worker pool is finite; long-running CPU or model workloads can
therefore limit throughput. Add Uvicorn worker processes only after accounting for the
memory cost of loading a separate embedding model and reranker in each process. Upload
and conversation files are local to a process host and are not a distributed job queue.
The embedding and reranker model calls are serialized per process; FAISS index reads,
reconstruction, publication, and cache invalidation share a process-local lock.

## Security and Threat Model

The default supported mode is a single-user local tool bound to loopback. `API_KEY` is
required to use protected API routes; health remains unauthenticated for probes. Set a
high-entropy key in the backend environment and the same `VITE_API_KEY` in the frontend
environment for local use. A Vite client embeds that key in browser-delivered code, so
this mechanism is not user identity or a safe way to distribute a shared secret to
untrusted clients. Network deployments must use TLS and an authenticated reverse proxy
or another per-user identity layer, restrict CORS to trusted origins, and explicitly
configure the host and production environment. API keys should be rotated and must not
be committed.

## Frontend Architecture

- **Component decomposition**: 21 focused components in `frontend/src/components/`, grouped into chat, layout, navigation, and ui subfolders
- **State management**: Zustand stores for chat sessions and documents
- **Streaming**: fetch + ReadableStream for SSE, token-by-token rendering
- **Theme**: 3-option (light/dark/system) with localStorage persistence and FOUC prevention

## Known Limitations

1. **Single-user**: API-key gate only; no user identities, role-based access, or multi-tenancy.
2. **No OCR**: Text is extracted from embedded text layers only (`PyMuPDF4LLM` for PDF, `python-docx` for DOCX, plain-text readers for everything else); scanned or image-only documents yield no chunks.
3. **Processing is synchronous**: Document upload blocks its worker thread until indexing completes. For large documents, this can take 10-30s.
