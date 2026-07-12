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

- 📄 Upload and process documents
- 🤖 AI-powered question answering
- 🔍 Semantic search using vector embeddings
- 🧠 Retrieval-Augmented Generation (RAG)
- ⚡ FastAPI backend
- 🎨 React + TypeScript frontend
- 🔐 Environment-based configuration
- 📦 Modular architecture
- 🐳 Docker support
- 🚀 Easy deployment

---

# 🏗️ Project Structure

```text
rag_application/
│
├── backend/
│   ├── app/
│   ├── uploads/
│   ├── vector_store/
│   ├── requirements.txt
│   └── main.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── .env.example
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

- LangChain
- Hugging Face Transformers
- Sentence Transformers
- FAISS / ChromaDB

## DevOps

- Docker
- Docker Compose
- Git
- GitLab

---

# 📋 Prerequisites

Before running the project, ensure the following are installed:

- Python 3.11+
- Node.js 20+
- npm
- Git
- Docker & Docker Compose (optional but recommended)

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

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment:

### Linux/macOS

```bash
source .venv/bin/activate
```

### Windows

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file according to your local configuration.

---

# 🚀 Run Backend

```bash
uvicorn app.main:app --reload
```

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

# 🐳 Docker Setup

## Build Containers

```bash
docker compose build
```

## Start Containers

```bash
docker compose up
```

Run in detached mode:

```bash
docker compose up -d
```

## Stop Containers

```bash
docker compose down
```

## Rebuild After Changes

```bash
docker compose up --build
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
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or using Gunicorn:

```bash
gunicorn -k uvicorn.workers.UvicornWorker app.main:app
```

The backend can be deployed on:

- Ubuntu Server
- Docker
- Railway
- Render
- DigitalOcean
- AWS EC2

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

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/upload` | Upload documents |
| POST | `/query` | Query documents |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger documentation |

---

# 🧪 Testing

Backend tests:

```bash
pytest
```

Frontend tests:

```bash
npm test
```

Lint frontend:

```bash
npm run lint
```

---

# 🛣️ Roadmap

### Completed

- Document upload
- Semantic retrieval
- Vector embeddings
- FastAPI backend
- React frontend
- API integration
- Docker support

### Planned

- Authentication
- User management
- Multi-document chat
- Chat history
- Streaming responses
- OCR support
- Additional document formats
- Cloud deployment
- Performance improvements

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
- LangChain
- Hugging Face
- Sentence Transformers
- FAISS
- ChromaDB
- Docker
- Python

Their outstanding work has greatly contributed to the development of this project.

---

# 📄 License

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute this project under the terms of the MIT License.

---

# 📌 Project Status

🚧 **Active Development**

This project is actively maintained and continuously improved with new features, optimizations, and enhanced AI capabilities.

Community feedback, issue reports, and contributions are always welcome.

---

⭐ If you found this project helpful, consider giving it a ⭐ and contributing to its future development.