from __future__ import annotations

import time

from app.rag.retriever import BM25Scorer


def benchmark(document_count: int) -> None:
    documents = [
        f"shared overview topic-{index % 100} section-{index % 1000} "
        f"reference-{index % 5000}"
        for index in range(document_count)
    ]

    started = time.perf_counter()
    scorer = BM25Scorer()
    scorer.fit(documents)
    fit_seconds = time.perf_counter() - started

    started = time.perf_counter()
    scores = scorer.batch_score(
        "shared overview topic-42 section-17",
        list(range(document_count)),
    )
    score_seconds = time.perf_counter() - started

    print(
        f"{document_count:,} chunks: fit={fit_seconds:.3f}s, "
        f"batch_score={score_seconds:.3f}s, scored={len(scores):,}"
    )


if __name__ == "__main__":
    for count in (10_000, 100_000):
        benchmark(count)
