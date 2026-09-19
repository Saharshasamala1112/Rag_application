from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "phi3:mini"
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 1024

    # Embeddings
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    # Reranker
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_top_k: int = 8

    # Chunking
    chunk_size: int = 800
    chunk_overlap: int = 150

    # Retrieval
    retrieval_top_k: int = 12
    final_top_k: int = 5

    # Upload
    upload_dir: Path = Path("data/uploads")
    max_file_size_mb: int = 50

    # Query expansion
    use_query_expansion: bool = True
    use_hyde: bool = True


settings = Settings()

settings.upload_dir.mkdir(parents=True, exist_ok=True)
