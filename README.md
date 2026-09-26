# 🧠 RAG Application

A **Retrieval-Augmented Generation (RAG)** application that enables users to upload documents and interact with them through an AI-powered conversational interface. By combining semantic search with Large Language Models (LLMs), the application provides accurate, context-aware responses based on the uploaded content.

This project demonstrates the implementation of a modern full-stack RAG pipeline, integrating document processing, vector embeddings, semantic retrieval, and AI-powered question answering.

---

# 📖 Overview

Traditional language models rely only on their pre-trained knowledge, which can result in outdated or inaccurate responses. Retrieval-Augmented Generation (RAG) overcomes this limitation by retrieving relevant information from user-provided documents before generating answers.

This application allows users to:

- Upload documents
- Automatically process and index them
- Ask natural language questions
- Receive responses grounded in the uploaded documents

The project follows a modular architecture, making it easy to extend, maintain, and deploy.

---

# ✨ Features

- 📄 Upload and process documents (PDF, Word, Markdown, CSV, JSON, HTML, source files;
  full list at `GET /api/v1/upload/supported-types`)
- 🤖 AI-powered question answering with streamed SSE responses
- 🔍 Hybrid retrieval: FAISS vectors + BM25 with reciprocal rank fusion
- 🧠 Retrieval-Augmented Generation (RAG) with cross-encoder reranking
- 💬 Server-side conversation history and document collections
- ⚡ FastAPI backend
- 🎨 React + TypeScript frontend
- 🔐 Environment-based configuration
- 📦 Modular architecture
- 🚀 Easy deployment

---

# 🏗️ Project Structure

```text
rag_application/
│
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Health, upload, query, documents, conversations, collections
│   │   ├── config/           # Settings, logging
│   │   ├── models/           # Pydantic models
│   │   ├── rag/              # Core RAG: chunking, embeddings, retriever, reranker, LLM
│   │   └── services/         # Business logic
│   ├── scripts/              # Schema update + dead-code whitelist helpers
│   ├── data/uploads/         # Uploaded documents + indexes (runtime, gitignored)
│   ├── .env.example
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Chat, layout, navigation, and UI components
│   │   ├── hooks/            # useChat, useUpload
│   │   ├── lib/              # Breakpoints, media queries, shared utilities
│   │   ├── pages/            # Chat, documents, collections, history, search, settings
│   │   ├── services/         # API service layer
│   │   ├── store/            # Zustand stores
│   │   └── types/            # TypeScript types (incl. generated API types)
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── contracts/
│   └── openapi.json          # Canonical OpenAPI schema (checked in CI)
│
├── .gitlab-ci.yml
├── ARCHITECTURE.md
├── README.md
└── .gitignore
```

---

# ⚙️ Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Python
- FastAPI
- Uvicorn

## AI & Machine Learning

- langchain-text-splitters (chunking)
- Sentence Transformers (`BAAI/bge-small-en-v1.5` embeddings)
- FAISS (vector search)
- BM25 + cross-encoder reranking (`cross-encoder/ms-marco-MiniLM-L-6-v2`)
- Ollama (local LLM inference)

## DevOps

- Git
- GitLab CI/CD

---

# 📋 Prerequisites

Before running the project, ensure the following are installed:

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (recommended; `pip` also works)
- Node.js 22+
- npm
- Git
- [Ollama](https://ollama.com/) with the default model (`llama3.2:latest`) for
  answer generation

---

# 📥 Clone the Repository

```bash
git clone https://code.swecha.org/saharsha1/rag_application.git
```

```bash
cd rag_application
```

---

# ⚙️ Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies (with `uv`, same as CI):

```bash
uv sync --frozen --extra dev --extra models
```

Or with `pip`:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy environment variables:

```bash
cp .env.example .env
```

Set `API_KEY` to a high-entropy local secret in `backend/.env`, then set the same value
as `VITE_API_KEY` in `frontend/.env` (copy `frontend/.env.example`). Protected API
routes require this key; `/api/v1/health` remains available for health checks. The
backend defaults to `127.0.0.1`. For production, set `ENV=production` to disable the
interactive API documentation and deploy behind TLS and an authenticated reverse proxy.
Do not commit either `.env` file.

---

# 🚀 Run Backend

```bash
uv run uvicorn app.main:app --reload
```

(`uvicorn app.main:app --reload` works the same inside an activated virtualenv.)

Backend will be available at:

```
http://localhost:8000
```

Swagger API Documentation:

```
http://localhost:8000/docs
```

---

# 💻 Frontend Setup

Open another terminal.

Navigate to frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Frontend:

```
http://localhost:5173
```

---

# 🚀 Build for Production

## Frontend

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

# 🌐 Hosting

## Frontend

Build:

```bash
npm run build
```

The generated production files will be located in:

```text
frontend/dist
```

These files can be hosted on:

- GitLab Pages
- Netlify
- Vercel
- Nginx
- Apache

---

## Backend

Run the production server:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Set `ENV=production` to disable the interactive API documentation, and bind to
loopback unless you deliberately expose the service.

The backend can be deployed on:

- Ubuntu Server
- Railway
- Render
- DigitalOcean
- AWS EC2

There are no Dockerfiles or Compose files in this repository; deployments run
the process directly (systemd, a process supervisor, or a PaaS runtime).

---

# 📚 Usage

1. Start the backend server.
2. Start the frontend application.
3. Open the application in your browser.
4. Upload one or more documents.
5. Wait for indexing to complete.
6. Ask questions in natural language.
7. The application retrieves relevant document chunks.
8. The AI generates context-aware responses.

---

# 🔌 API Endpoints

Unless noted otherwise, endpoints are prefixed with `/api/v1` and require the
`X-API-Key` header (`/api/v1/health*` is exempt). The table below matches
`contracts/openapi.json` and is verified by `scripts/check_docs.py` in CI.

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/health/live` | Liveness probe (no dependency checks) |
| GET | `/api/v1/health/ready` | Readiness probe |
| POST | `/api/v1/upload` | Upload and process a document |
| POST | `/api/v1/upload/text` | Create a document from typed text |
| GET | `/api/v1/upload/supported-types` | List supported file types |
| POST | `/api/v1/query` | Query documents (returns full response) |
| POST | `/api/v1/query/stream` | Query with SSE streaming |
| GET | `/api/v1/documents` | List all uploaded documents |
| GET | `/api/v1/documents/{id}` | Get document details |
| PATCH | `/api/v1/documents/{id}` | Rename a document |
| DELETE | `/api/v1/documents/{id}` | Delete a document |
| GET | `/api/v1/documents/{id}/status` | Get processing status |
| GET | `/api/v1/documents/{id}/preview` | Get document text preview |
| GET | `/api/v1/documents/{id}/chunks` | Get extracted chunks |
| GET | `/api/v1/conversations` | List conversations |
| POST | `/api/v1/conversations` | Create a conversation |
| GET | `/api/v1/conversations/{id}` | Get a conversation with messages |
| PATCH | `/api/v1/conversations/{id}` | Update conversation title |
| DELETE | `/api/v1/conversations/{id}` | Delete a conversation |
| GET | `/api/v1/collections` | List collections |
| POST | `/api/v1/collections` | Create a collection |
| GET | `/api/v1/collections/{id}` | Get a collection |
| PATCH | `/api/v1/collections/{id}` | Update a collection |
| DELETE | `/api/v1/collections/{id}` | Delete a collection |
| GET | `/` | Service root (no API key) |
| GET | `/metrics` | Prometheus-style request metrics (no API key) |
| GET | `/docs` | Swagger UI (disabled when `ENV=production`) |

---

# 🧪 Testing

Backend tests (from `backend/`):

```bash
uv run pytest
```

Frontend tests (from `frontend/`):

```bash
npm test
```

Lint, type-check, and dead-code checks:

```bash
npm run lint
npm run typecheck
npm run knip
```

Verify the committed OpenAPI schema is up to date (from `backend/`):

```bash
uv run python -m scripts.update_openapi_schema --check
```

These same checks run in GitLab CI (`.gitlab-ci.yml`), together with
`scripts/check_docs.py`, which validates file paths and the API table in this
document against the code.

---

# 🛣️ Roadmap

### Completed

- Document upload and processing (file and text uploads)
- Hybrid search (semantic FAISS + BM25 with RRF fusion)
- Cross-encoder reranking for relevance
- Streaming SSE responses
- Multi-document support with document management
- Document collections
- Server-side conversation history with a localStorage session mirror
- Markdown rendering for answers
- Source citations with relevance scores
- FastAPI backend with CORS, API-key auth, and API versioning
- Typed Pydantic request/response models with a contract-enforced OpenAPI schema
- React + TypeScript frontend with Zustand state
- Pydantic-settings configuration
- CI quality gates: ruff, pytest coverage, vulture, knip, prettier, type-check,
  generated-type drift, and doc checks

### Planned

- Authentication
- User management
- OCR support
- Additional document formats
- Cloud deployment
- Query expansion (HyDE)
- Performance optimizations

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository

2. Create a new branch

```bash
git checkout -b feature/new-feature
```

3. Commit changes

```bash
git commit -m "Add new feature"
```

4. Push changes

```bash
git push origin feature/new-feature
```

5. Create a Merge Request

Please ensure your code follows the project structure and passes all tests before submitting.

---

# 👥 Team

This project was collaboratively developed as a full-stack AI application.

## **Saharsha Samala**
### Frontend Developer

**Responsibilities**

- Designed and developed the complete frontend using React, TypeScript, and Vite.
- Built responsive and interactive user interfaces.
- Integrated frontend with backend APIs.
- Implemented routing, state management, and reusable UI components.
- Improved user experience through clean and scalable frontend architecture.

---

## **R. Nitheesha**
### Backend Developer

**Responsibilities**

- Designed and developed the FastAPI backend.
- Implemented document processing and embedding generation.
- Integrated vector database for semantic retrieval.
- Developed REST APIs for document upload and querying.
- Managed backend architecture, configuration, and server-side functionality.

---

## 🤝 Collaboration

Both team members collaborated on:

- API integration
- System architecture
- Testing
- Debugging
- Deployment
- Project documentation

| Team Member | Role | Contribution |
|------------|------|--------------|
| **Saharsha Samala** | Frontend Developer | UI Development, API Integration, Frontend Architecture |
| **R. Nitheesha** | Backend Developer | FastAPI Backend, Vector Search, Document Processing |

---

# 🙏 Acknowledgements

We sincerely thank the open-source community and the developers behind the technologies that made this project possible.

Special thanks to:

- FastAPI
- React
- TypeScript
- Vite
- Tailwind CSS
- langchain-text-splitters
- Hugging Face Sentence Transformers
- FAISS
- Ollama
- Python

Their outstanding work has greatly contributed to the development of this project.

---

# 📄 License

No license file is published in this repository yet. Until the maintainers add
one, all rights are reserved by the authors; reach out before redistributing.

---

# 📌 Project Status

🚧 **Active Development**

This project is actively maintained and continuously improved with new features, optimizations, and enhanced AI capabilities.

Community feedback, issue reports, and contributions are always welcome.

---

⭐ If you found this project helpful, consider giving it a ⭐ and contributing to its future development.