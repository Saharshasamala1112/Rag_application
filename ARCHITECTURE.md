# DocuChat Architecture

## Overview

DocuChat is a local-first RAG (Retrieval-Augmented Generation) document workspace. The architecture prioritizes correctness, local operation, and production-grade retrieval quality over scale.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | FastAPI + async | Native async for streaming SSE, Pydantic for contract enforcement, fast iteration |
| Vector store | FAISS (IndexFlatIP) | Single-user/local deployment. In-memory search is fast for <100K chunks. No external service needed. |
| Embeddings | `BAAI/bge-small-en-v1.5` (384d) | Best quality-per-parameter ratio for general English text. Small enough for local CPU inference. Pinned version. |
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
6. **Context assembly**: Top-k chunks with metadata, respecting 6000-char token budget
7. **Generation**: Ollama with strict document-grounded prompting, streaming via SSE

## Data Storage

All data lives in `data/uploads/`:

```
data/uploads/
├── {document_id}/
│   ├── original.{ext}        # Uploaded file
│   ├── document_info.json    # Metadata + processing state
│   ├── chunks.json           # Extracted chunks with metadata
│   └── index.faiss           # FAISS vector index
├── conversations/
│   ├── {conversation_id}.json  # Conversation metadata + messages
```

### Why FAISS over pgvector/Qdrant

- **Local-first**: No database server to manage
- **Fast enough**: <100K chunks search in <10ms on CPU
- **Simple**: No connection pools, no migrations, no Docker dependency
- **Trade-off**: Not persistent across process restarts for the in-memory index, but chunks.json is persisted and index is rebuilt on startup

### Why not pgvector/Qdrant

Would be the right choice for multi-user or large-scale deployment. For a single-user local tool, the operational overhead isn't justified.

## API Design

- All endpoints under `/api/v1` prefix
- Typed Pydantic models for every request/response
- SSE streaming for chat (never buffer full response)
- Error responses: `{"detail": "Human-readable message", "type": "error_code"}`
- Request ID middleware for tracing

## Frontend Architecture

- **Component decomposition**: 12 focused components from the original 873-line monolith
- **State management**: Zustand stores for chat sessions and documents
- **Streaming**: fetch + ReadableStream for SSE, token-by-token rendering
- **Theme**: 3-option (light/dark/system) with localStorage persistence and FOUC prevention

## Known Limitations

1. **Single-user**: No auth, no multi-tenancy. Designed for personal use.
2. **FAISS rebuild**: Vector index is rebuilt from chunks.json on startup. First query after restart may be slower.
3. **No conversation persistence on server**: Conversations are localStorage-only. Server has no conversation API (v1).
4. **Processing is synchronous**: Document upload blocks until indexing completes. For large documents, this can take 10-30s.
