# Backend resource limits and benchmarks

## Storage and history limits

`MAX_DOCUMENT_COUNT` limits persisted document records (default: 1,000), while
`MAX_TOTAL_STORAGE_MB` limits all files in their document directories
(default: 10,240 MiB). Exceeding the count returns HTTP 429; exceeding total storage returns
HTTP 413. `MAX_CONVERSATION_MESSAGES` bounds each conversation to its newest
messages (default: 200). The document and conversation list APIs use a
two-second in-process cache that is invalidated on writes.

Chunk boundaries are character-based. The default 800-character chunk is
typically about 200 English-language tokens, which keeps embedding chunks
compact; `CHUNK_SIZE` and `CHUNK_OVERLAP` remain character counts. Answer
context uses a separate tokenizer-based budget (`MAX_CONTEXT_TOKENS`).

## BM25 benchmark

Run `PYTHONPATH=. .venv/bin/python scripts/benchmark_bm25.py` from `backend/`.
The script measures fitting a synthetic corpus and scoring one query against
every chunk; it does not include embedding or FAISS search.

Recorded on Linux with Python 3.12.13:

| Chunks | Fit | Batch scoring |
| ---: | ---: | ---: |
| 10,000 | 0.056 s | 0.060 s |
| 100,000 | 0.614 s | 0.499 s |

These are local baseline measurements, not CI performance thresholds. Run the
script on the deployment hardware before using them for capacity planning.
