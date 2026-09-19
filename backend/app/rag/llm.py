from __future__ import annotations

import logging
from typing import Generator

from ollama import Client

from app.config.settings import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert AI assistant that answers questions accurately based on the provided document context.

RULES:
1. Answer ONLY from the provided context. Do not make up information.
2. If the answer is not in the context, say "I could not find the answer in the uploaded document."
3. Be precise and concise. Use specific details from the context.
4. When referencing information, mention which part of the document it came from.
5. Use bullet points or structured formatting when listing multiple items.
6. If the question is ambiguous, address the most likely interpretation.
7. Never fabricate page numbers or section names not present in the context."""


class LocalLLM:
    """Ollama LLM wrapper with streaming support."""

    def __init__(
        self,
        model: str = settings.ollama_model,
    ) -> None:
        self.client = Client(host=settings.ollama_host)
        self.model = model

    def _build_prompt(
        self,
        question: str,
        context: str,
    ) -> str:
        return f"""{SYSTEM_PROMPT}

--- DOCUMENT CONTEXT ---
{context}
--- END CONTEXT ---

Question: {question}

Provide a clear, accurate answer based on the context above:"""

    def generate(
        self,
        question: str,
        context: str,
    ) -> str:
        """Generate a complete answer."""

        prompt = self._build_prompt(question, context)

        try:
            response = self.client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={
                    "temperature": settings.ollama_temperature,
                    "num_predict": settings.ollama_num_predict,
                    "top_k": 20,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                },
            )
            return response["message"]["content"].strip()
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            return f"Error generating response: {e}"

    def generate_stream(
        self,
        question: str,
        context: str,
    ) -> Generator[str, None, None]:
        """Stream answer tokens."""

        prompt = self._build_prompt(question, context)

        try:
            stream = self.client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={
                    "temperature": settings.ollama_temperature,
                    "num_predict": settings.ollama_num_predict,
                    "top_k": 20,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                },
                stream=True,
            )

            for chunk in stream:
                if "message" in chunk and "content" in chunk["message"]:
                    yield chunk["message"]["content"]

        except Exception as e:
            logger.error("LLM streaming failed: %s", e)
            yield f"Error: {e}"
