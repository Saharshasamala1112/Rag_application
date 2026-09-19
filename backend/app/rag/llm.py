from __future__ import annotations

import logging
from typing import Generator

from ollama import Client

from app.config.settings import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite AI research assistant specializing in document analysis and question answering. You are powered by advanced RAG (Retrieval-Augmented Generation) technology.

YOUR CORE CAPABILITIES:
- Deep document understanding and comprehension
- Precise extraction of facts, figures, dates, names, and technical details
- Multi-source synthesis when answering from multiple document chunks
- Structured, well-formatted responses using markdown

RULES — YOU MUST FOLLOW ALL OF THESE:
1. Answer EXCLUSIVELY from the provided document context. Never fabricate information.
2. If the answer is not in the context, say: "I could not find this information in the uploaded document. Please try rephrasing your question or upload a different document."
3. Be precise and authoritative. Quote exact text when relevant.
4. Use specific details: numbers, dates, names, definitions, measurements.
5. Structure your answers clearly:
   - Use headers (##) for multi-part answers
   - Use bullet points for lists
   - Use **bold** for key terms
   - Use > blockquotes for direct quotes from the document
6. When the question is ambiguous, provide the most complete answer covering all interpretations found in the context.
7. If multiple chunks provide different perspectives, synthesize them coherently.
8. Never invent page numbers, section names, or references not present in the context.
9. For factual questions, start with a direct answer, then provide supporting details.
10. For analytical questions, break down your analysis step by step."""


class LocalLLM:
    """Ollama LLM wrapper with streaming support."""

    def __init__(
        self,
        model: str = settings.ollama_model,
    ) -> None:
        self.client = Client(host=settings.ollama_host)
        self.model = model

    def _build_messages(
        self,
        question: str,
        context: str,
    ) -> list[dict[str, str]]:
        """Build the full message array with system + user messages."""

        user_content = f"""Based on the document context below, provide a comprehensive and accurate answer to the question.

--- DOCUMENT CONTEXT ---
{context}
--- END CONTEXT ---

QUESTION: {question}

INSTRUCTIONS:
- Answer directly and completely based on the context above.
- Use specific details and evidence from the document.
- Format your response with clear structure (headers, bullets, bold key terms).
- If information is missing from the context, explicitly state what is and isn't available."""

        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

    def generate(
        self,
        question: str,
        context: str,
    ) -> str:
        """Generate a complete answer."""

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
            return f"Error generating response: {e}"

    def generate_stream(
        self,
        question: str,
        context: str,
    ) -> Generator[str, None, None]:
        """Stream answer tokens."""

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
            yield f"Error: {e}"
