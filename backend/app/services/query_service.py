from __future__ import annotations

import time
from pathlib import Path

from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.rag.llm import LocalLLM
from app.rag.retriever import Retriever


class QueryService:
    """Handle document queries."""

    def __init__(self) -> None:
        self.retriever = Retriever()
        self.llm = LocalLLM()

    def query(
        self,
        request: QueryRequest,
    ) -> QueryResponse:
        """Retrieve relevant chunks and generate an answer."""

        document_dir = Path("data/uploads") / request.document_id

        retrieval_start = time.perf_counter()

        results = self.retriever.retrieve(
            document_dir=document_dir,
            question=request.question,
            top_k=request.top_k,
        )

        print(f"Retrieval took {time.perf_counter() - retrieval_start:.2f} seconds.")

        context = "\n\n".join(chunk["content"][:400] for chunk in results[:3])

        print(f"Context length: {len(context)} characters")

        llm_start = time.perf_counter()

        answer = self.llm.generate(
            question=request.question,
            context=context,
        )

        print(f"LLM generation took {time.perf_counter() - llm_start:.2f} seconds.")

        return QueryResponse(
            answer=answer,
            sources=results,
        )
