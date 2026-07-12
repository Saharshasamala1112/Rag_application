from __future__ import annotations

from ollama import Client


class LocalLLM:
    """Ollama wrapper."""

    def __init__(
        self,
        model: str = "phi3:mini",
    ) -> None:
        self.client = Client(
            host="http://localhost:11434",
        )
        self.model = model

    def generate(
        self,
        question: str,
        context: str,
    ) -> str:
        prompt = f"""
You are a helpful AI assistant.

Answer ONLY from the context below.

If the answer is not available, reply exactly:

I couldn't find the answer in the uploaded document.

Keep the answer under 100 words.

Context:
{context}

Question:
{question}

Answer:
"""

        response = self.client.chat(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            options={
                "temperature": 0,
                "num_predict": 80,
                "top_k": 20,
                "top_p": 0.9,
                "repeat_penalty": 1.1,
            },
        )

        return response["message"]["content"].strip()
