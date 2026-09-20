from __future__ import annotations

import logging
from typing import Generator

from ollama import Client

from app.config.settings import settings
from app.exceptions import LLMError

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite AI research assistant specializing in document analysis and question answering.

RULES:
1. Answer EXCLUSIVELY from the provided document context. Never fabricate information.
2. If the answer is not in the context, say so clearly.
3. Be precise. Quote exact text when relevant.
4. Use specific details: numbers, dates, names, definitions, measurements.
5. Structure answers clearly with headers, bullets, and bold key terms.
6. Never invent page numbers, section names, or references not present in the context.
7. For factual questions, start with a direct answer, then provide supporting details."""


class LocalLLM:
    """Ollama LLM wrapper with streaming support."""

    def __init__(self) -> None:
        self.client = Client(host=settings.ollama_host)
        self.model = settings.resolve_model()
        logger.info("LLM initialized with model: %s", self.model)

    def _build_messages(
        self,
        question: str,
        context: str,
    ) -> list[dict[str, str]]:
        """Build the full message array with system + user messages."""

        user_content = f"""Based on the document context below, answer the question.

--- DOCUMENT CONTEXT ---
{context}
--- END CONTEXT ---

QUESTION: {question}

Answer directly and completely. Use evidence from the context. Format with clear structure."""

        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

    def generate(
        self,
        question: str,
        context: str,
    ) -> str:
        """Generate a complete answer. Raises LLMError on failure."""

        messages = self._build_messages(question, context)

        try:
            response = self.client.chat(
                model=self.model,
                messages=messages,
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
            raise LLMError(f"Failed to generate response: {e}") from e

    def generate_stream(
        self,
        question: str,
        context: str,
    ) -> Generator[str, None, None]:
        """Stream answer tokens. Raises LLMError on connection failure."""

        messages = self._build_messages(question, context)

        try:
            stream = self.client.chat(
                model=self.model,
                messages=messages,
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
            raise LLMError(f"LLM stream failed: {e}") from e
