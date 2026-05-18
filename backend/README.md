# Backend Starter

## Quick Start

0. Start infrastructure (Redis, MinIO, Qdrant):

```powershell
cd apps/backend
npm run docker:infra
```

1. Copy env file:
   - `Copy-Item .env.example .env` (PowerShell)
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Run migrations: `npx prisma migrate dev --name init`
5. Start API: `npm run dev`
6. Start document worker (second terminal): `npm run worker`

## Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| Redis | 6379 | BullMQ job queue |
| MinIO API | 9000 | File storage |
| MinIO Console | 9001 | Web UI (`minioadmin` / `minioadmin123`) |
| Qdrant | 6333 | Vector search |

Commands:

- Start all: `npm run docker:infra`
- Redis only: `npm run docker:up`
- Stop: `npm run docker:down`
- Logs: `npm run docker:logs`

## Document processing flow

1. Upload file via `POST /api/documents` (multipart field: `file`)
2. API stores file in **MinIO** and creates DB row (`PENDING`)
3. Job is queued in **Redis** (BullMQ)
4. **Worker** (`npm run worker`):
   - `PROCESSING` → parse PDF/DOCX/TXT → chunk → embed (Ollama) → store in **Qdrant** → `READY`
5. **Chat** and **Search** query Qdrant for relevant chunks

## Local Ollama

- Chat model: `deepseek-r1:14b` (set in `.env`)
- Embedding model: `nomic-embed-text` (required for document indexing)

```powershell
ollama pull deepseek-r1:14b
ollama pull nomic-embed-text
```

## Default API URLs

- Health: `GET /health`
- Auth: `/api/auth`
- Documents: `/api/documents` (multipart upload)
- Chat: `/api/chat`
- Search: `/api/search?query=...`
- Audit: `/api/audit`
