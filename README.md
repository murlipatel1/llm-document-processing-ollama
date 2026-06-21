# Enterprise Knowledge Base
### Full-Stack RAG System · JavaScript Monorepo · Resume-Worthy

> **Stack:** Next.js 15 · Fastify 5 · Prisma 7 · PostgreSQL 17 · Qdrant · BullMQ 5 · Redis 7 · MinIO · Ollama · LangChain.js 1.x

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Architecture Overview](#3-architecture-overview)
4. [RAG Pipeline Deep Dive](#4-rag-pipeline-deep-dive)
5. [Tech Stack](#5-tech-stack)
6. [Project Structure](#6-project-structure)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Auth & RBAC](#9-auth--rbac)
10. [Multi-Tenancy](#10-multi-tenancy)
11. [Document Processing Pipeline](#11-document-processing-pipeline)
12. [Chat & Streaming](#12-chat--streaming)
13. [Audit Logging](#13-audit-logging)
14. [Docker Services](#14-docker-services)
15. [Key npm Packages](#15-key-npm-packages)
16. [Getting Started](#16-getting-started)
17. [Environment Variables](#17-environment-variables)
18. [Resume Highlights](#18-resume-highlights)
19. [Knowledge Graph](#19-knowledge-graph)
20. [Manual Setup — PostgreSQL & Ollama](#20-manual-setup--postgresql--ollama)
21. [Remaining Development](#21-remaining-development)

---

## 1. Problem Statement

Companies waste thousands of hours every year searching through internal documents — PDFs, architecture docs, meeting notes, onboarding guides, product specs. Employees repeat the same questions because knowledge is buried in files no one can search.

**This project solves that** by building an internal AI assistant that:
- Ingests any document (PDF, DOCX, meeting notes)
- Understands it semantically using vector embeddings
- Answers questions like *"How does the payment service work?"* by reading your actual docs
- Enforces role-based access and logs every action for compliance

---

## 2. Solution Overview

```
Employee asks:  "How does the payment service work?"
                         ↓
    AI searches internal docs semantically (not keyword)
                         ↓
    Retrieves the most relevant chunks from architecture docs
                         ↓
    Sends chunks as context to local LLM (Ollama)
                         ↓
    Streams a grounded, cited answer back to the employee
```

**Key capabilities:**

| Capability | Description |
|---|---|
| Document Upload | PDF, DOCX, plain text — drag and drop |
| Semantic Search | Find docs by meaning, not exact keywords |
| Chat with Docs | Ask questions, get AI answers with source citations |
| Summarization | Auto-summarize uploaded documents (`Document.summary`) |
| Knowledge Graph | Interactive map of documents, chunks, and shared topics |
| Multi-Tenant | Each company/org has fully isolated data |
| RBAC | Admin / Editor / Viewer role enforcement |
| Audit Logs | Every action logged — who did what, when |
| Local LLM | Ollama runs on your hardware, no API costs |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Chat UI  │  │ Doc Upload   │  │  Search  │  │  Admin    │  │
│  │ (SSE     │  │ (Dropzone)   │  │   UI     │  │  Panel    │  │
│  │ stream)  │  │              │  │          │  │           │  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └─────┬─────┘  │
└───────┼───────────────┼───────────────┼───────────────┼─────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Fastify + Node.js)                  │
│                                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐  │
│  │   chat   │  │  documents   │  │  search  │  │   audit   │  │
│  │ module   │  │   module     │  │  module  │  │  module   │  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └─────┬─────┘  │
│       │               │               │               │          │
│  ┌────┴────────────────┴───────────────┴───────────────┴──────┐ │
│  │              Middleware: JWT Auth · RBAC · Tenant           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────┬───────────────┬───────────────┬───────────────┬──────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Qdrant  │   │PostgreSQL│   │  MinIO   │   │  Redis   │
   │(vectors)│   │(metadata)│   │ (files)  │   │(BullMQ)  │
   └─────────┘   └──────────┘   └──────────┘   └──────────┘
        ▲                                            │
        │                                            ▼
        │                                   ┌──────────────┐
        └───────────────────────────────────│  Processor   │
                                            │  Worker      │
                                            │  (BullMQ)    │
                                            └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │    Ollama    │
                                            │  (LLM +      │
                                            │  Embeddings) │
                                            └──────────────┘
```

---

## 4. RAG Pipeline Deep Dive

### 4.1 Ingestion Pipeline

```
User uploads PDF/DOCX
        │
        ▼
┌───────────────┐
│  Fastify API  │  — validates file type, writes metadata to PostgreSQL
│  /upload      │  — streams file to MinIO (blob storage)
└───────┬───────┘  — enqueues job to BullMQ: { documentId, tenantId }
        │
        ▼
┌───────────────────────────────────────────────────────┐
│               BullMQ Processor Worker                  │
│                                                        │
│  1. Fetch file bytes from MinIO                        │
│  2. Parse text:                                        │
│       PDF  → pdf-parse   → raw text string             │
│       DOCX → mammoth     → raw text string             │
│                                                        │
│  3. Chunk text (LangChain.js):                         │
│       RecursiveCharacterTextSplitter                   │
│       chunkSize: 500 tokens                            │
│       chunkOverlap: 50 tokens                          │
│       → produces [ chunk_1, chunk_2, ... chunk_n ]     │
│                                                        │
│  4. Embed each chunk (Ollama API):                     │
│       POST http://ollama:11434/api/embeddings          │
│       model: nomic-embed-text                          │
│       → [ float32[768], float32[768], ... ]            │
│                                                        │
│  5. Upsert to Qdrant:                                  │
│       collection: tenant_{tenantId}                    │
│       payload: { chunkText, documentId, filename }     │
│       → vectors stored with metadata filter support    │
│                                                        │
│  6. Update Document.status = READY in PostgreSQL       │
│     Update Document.chunkCount = n                     │
└───────────────────────────────────────────────────────┘
```

### 4.2 Query / RAG Pipeline

```
User sends: "How does the payment service work?"
        │
        ▼
┌───────────────┐
│  POST /chat   │  — authenticates JWT → gets tenantId
│  Fastify API  │  — opens SSE stream to client
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                  RAG Chain (LangChain.js)              │
│                                                        │
│  1. Embed the query:                                   │
│       POST ollama:11434/api/embeddings                 │
│       model: nomic-embed-text                          │
│       → queryVector: float32[768]                      │
│                                                        │
│  2. Semantic retrieval from Qdrant:                    │
│       collection: tenant_{tenantId}                    │
│       search: cosine similarity, top-k = 5             │
│       filter: { tenantId: req.tenantId }               │
│       → [ { chunkText, score, documentId }, ... ]      │
│                                                        │
│  3. Build prompt:                                      │
│       System: "Answer using ONLY the context below."   │
│       Context: chunk_1 \n chunk_2 \n ... chunk_5       │
│       User: "How does the payment service work?"        │
│                                                        │
│  4. Stream to Ollama:                                  │
│       POST ollama:11434/api/generate                   │
│       model: llama3.3                                  │
│       stream: true                                     │
│       → token-by-token response                        │
│                                                        │
│  5. Forward each token as SSE event to browser:        │
│       data: { token: "The", done: false }              │
│       data: { token: " payment", done: false }         │
│       data: { done: true, sources: [...] }             │
└───────────────────────────────────────────────────────┘
```

---

## 5. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 (App Router) | SSR, file uploads, streaming chat, routing |
| React | 19 | UI framework |
| TailwindCSS | 4 | Utility-first styling |
| shadcn/ui | latest | Accessible pre-built components |
| TanStack Query | 5.100 | Server state, caching, background refetch |
| Axios | 1.15 | HTTP client with JWT interceptor |
| react-dropzone | 14 | Drag-and-drop file upload |
| eventsource-parser | 3.x | Parse Server-Sent Events token stream |
| Lucide React | 1.x | Icon library |
| date-fns | 4 | Date formatting |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 24 LTS | Runtime |
| Fastify | 5 | HTTP server — faster than Express, schema-first |
| @fastify/multipart | 10 | File upload streaming |
| Prisma | 7 | ORM + type-safe DB client |
| PostgreSQL | 17 | Relational data (users, tenants, docs, audit) |
| BullMQ | 5.76 | Redis-backed job queue with retries |
| ioredis | 5.10 | Redis client |
| minio | 8 | MinIO S3-compatible client |
| jsonwebtoken | 9 | JWT sign/verify |
| bcryptjs | 3 | Password hashing (salt rounds: 12) |
| zod | 4 | Runtime schema validation |

### AI / Vector

| Technology | Version / Tag | Purpose |
|---|---|---|
| Ollama | latest | Local LLM runtime — serves llama3.3, mistral, and embeddings |
| llama3.3 | 70b | Primary chat/generation model |
| nomic-embed-text | v1.5 | Embedding model (768-dim vectors) |
| LangChain.js | 1.x | Chunking, retrieval chains, prompt templates |
| Qdrant | latest | Vector database — cosine similarity, metadata filters |

### Infrastructure

| Service | Image | Port |
|---|---|---|
| PostgreSQL | postgres:17-alpine | 5432 |
| Qdrant | qdrant/qdrant:latest | 6333, 6334 |
| Redis | redis:7-alpine | 6379 |
| MinIO | minio/minio:latest | 9000 (API), 9001 (console) |
| Ollama | ollama/ollama:latest | 11434 |

---

## 6. Project Structure

```
enterprise-kb/
├── apps/
│   ├── frontend/                   # Next.js 15 App Router
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx      # Auth guard + sidebar shell
│   │   │       ├── page.tsx        # Main chat interface
│   │   │       ├── documents/
│   │   │       │   └── page.tsx    # Upload + list documents
│   │   │       ├── search/
│   │   │       │   └── page.tsx    # Semantic search UI
│   │   │       ├── graph/
│   │   │       │   └── page.tsx    # Knowledge graph visualization
│   │   │       ├── chat/
│   │   │       │   └── page.tsx    # Chat + conversation history
│   │   │       ├── users/
│   │   │       │   └── page.tsx    # Admin: user management
│   │   │       └── audit/
│   │   │           └── page.tsx    # Admin: audit trail
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx          # SSE streaming chat container
│   │   │   │   ├── MessageBubble.tsx       # User / assistant message bubble
│   │   │   │   ├── SourceCitations.tsx     # Expand retrieved source chunks
│   │   │   │   └── ChatInput.tsx           # Textarea + send button
│   │   │   ├── documents/
│   │   │   │   ├── UploadDropzone.tsx      # Drag-and-drop uploader
│   │   │   │   ├── DocumentList.tsx        # Table with status badges
│   │   │   │   └── ProcessingBadge.tsx     # PENDING / READY / FAILED
│   │   │   ├── search/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── SearchResult.tsx
│   │   │   ├── graph/
│   │   │   │   ├── KnowledgeGraph.tsx    # Force-directed graph canvas
│   │   │   │   ├── NodePanel.tsx         # Selected node detail panel
│   │   │   │   └── GraphHints.tsx
│   │   │   └── layout/
│   │   │       ├── Sidebar.tsx
│   │   │       ├── Navbar.tsx
│   │   │       └── RoleBadge.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios instance + JWT refresh interceptor
│   │   │   ├── auth.ts             # Token decode, session helpers
│   │   │   └── sse.ts              # EventSource / SSE parsing utility
│   │   ├── hooks/
│   │   │   ├── useChat.ts          # Chat state + SSE stream hook
│   │   │   ├── useDocuments.ts     # Document list + upload hook
│   │   │   ├── useSearch.ts        # Semantic search hook
│   │   │   └── useGraph.ts         # Knowledge graph data hook
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── backend/                    # Fastify API
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.controller.js  # POST /auth/register, /login, /refresh
│       │   │   │   ├── auth.service.js     # bcrypt + JWT sign/verify logic
│       │   │   │   └── auth.schema.js      # Fastify JSON Schema
│       │   │   ├── tenants/
│       │   │   │   ├── tenant.service.js   # Create tenant, validate slug
│       │   │   │   └── tenant.middleware.js # Inject req.tenant from JWT
│       │   │   ├── documents/
│       │   │   │   ├── documents.controller.js
│       │   │   │   ├── documents.service.js    # MinIO upload, Prisma write
│       │   │   │   ├── parser.service.js       # pdf-parse + mammoth
│       │   │   │   └── graph.service.js        # Knowledge graph builder
│       │   │   ├── processor/
│       │   │   │   ├── processor.worker.js     # BullMQ worker entry point
│       │   │   │   ├── chunker.js              # RecursiveCharacterTextSplitter
│       │   │   │   └── embedder.js             # Ollama /api/embeddings caller
│       │   │   ├── chat/
│       │   │   │   ├── chat.controller.js      # POST /chat — SSE endpoint
│       │   │   │   ├── chat.service.js         # History CRUD
│       │   │   │   └── rag.chain.js            # Full LangChain retrieval chain
│       │   │   ├── search/
│       │   │   │   ├── search.controller.js    # GET /search
│       │   │   │   └── qdrant.client.js        # Qdrant REST wrapper
│       │   │   └── audit/
│       │   │       ├── audit.middleware.js      # Fastify hook: log every request
│       │   │       └── audit.service.js         # Prisma AuditLog.create
│       │   ├── middleware/
│       │   │   ├── authenticate.js             # Verify JWT → inject req.user
│       │   │   ├── rbac.js                     # Role guard factory (minRole)
│       │   │   └── tenant.js                   # Inject req.tenant from JWT claim
│       │   ├── plugins/
│       │   │   ├── prisma.js                   # Fastify Prisma plugin (singleton)
│       │   │   ├── redis.js                    # BullMQ + ioredis connection
│       │   │   └── minio.js                    # MinIO client Fastify plugin
│       │   ├── config/
│       │   │   └── index.js                    # env var validation with zod
│       │   └── app.js                          # Fastify factory + route registration
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

### 6.1 Backend Folder Structure (Runnable)

```bash
apps/backend/
├── src/
│   ├── server.js                     # bootstrap: load env, start Fastify
│   ├── app.js                        # app factory: plugins, hooks, routes
│   │
│   ├── config/
│   │   ├── env.js                    # zod-based env validation
│   │   ├── constants.js              # role names, queue names, defaults
│   │   └── logger.js                 # pino logger config
│   │
│   ├── plugins/
│   │   ├── prisma.js                 # Prisma singleton
│   │   ├── redis.js                  # BullMQ / Redis connection
│   │   ├── minio.js                  # S3-compatible storage client
│   │   └── jwt.js                    # Fastify JWT plugin setup
│   │
│   ├── middleware/
│   │   ├── authenticate.js           # validates access token
│   │   ├── authorize.js              # RBAC role guard
│   │   ├── tenantScope.js            # tenant boundary enforcement
│   │   └── errorHandler.js           # normalized API errors
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.schema.js
│   │   ├── users/
│   │   │   ├── users.routes.js
│   │   │   ├── users.controller.js
│   │   │   ├── users.service.js
│   │   │   └── users.schema.js
│   │   ├── documents/
│   │   │   ├── documents.routes.js
│   │   │   ├── documents.controller.js
│   │   │   ├── documents.service.js
│   │   │   ├── parser.service.js
│   │   │   └── graph.service.js
│   │   ├── processor/
│   │   │   ├── queue.js              # BullMQ queue producer
│   │   │   ├── worker.js             # background job consumer
│   │   │   ├── chunker.js
│   │   │   └── embedder.js
│   │   ├── chat/
│   │   │   ├── chat.routes.js
│   │   │   ├── chat.controller.js
│   │   │   ├── chat.service.js
│   │   │   └── rag.chain.js
│   │   ├── search/
│   │   │   ├── search.routes.js
│   │   │   ├── search.controller.js
│   │   │   └── qdrant.client.js
│   │   └── audit/
│   │       ├── audit.routes.js
│   │       ├── audit.controller.js
│   │       ├── audit.service.js
│   │       └── audit.hook.js
│   │
│   ├── jobs/
│   │   ├── reindexTenant.js          # manual re-index command script
│   │   └── pruneChatHistory.js       # prune stale chat-history vectors
│   ├── utils/
│   │   ├── crypto.js
│   │   ├── pagination.js
│   │   └── sse.js
│   └── modules/chat/chat-history.qdrant.js  # long-term chat memory in Qdrant
│
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── scripts/
│   ├── dev.sh                        # local start helpers
│   └── wait-for-deps.sh              # optional container readiness checks
├── .env
├── .env.example
├── package.json
└── Dockerfile
```

**Run order (backend)**

```powershell
# from apps/backend (PostgreSQL + Ollama must already be running — see Section 20)
cd apps/backend
npm install
npm run docker:infra
npx prisma generate
npx prisma db push
npm run dev:all
```

---

## 7. Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Tenant (org isolation) ─────────────────────────────────────

model Tenant {
  id            String             @id @default(cuid())
  name          String
  slug          String             @unique         // used in Qdrant collection name
  users         User[]
  documents     Document[]
  auditLogs     AuditLog[]
  conversations ChatConversation[]
  chatMessages  ChatMessage[]
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}

// ─── User ────────────────────────────────────────────────────────

model User {
  id            String             @id @default(cuid())
  email         String             @unique
  password      String                              // bcrypt hash
  role          Role               @default(VIEWER)
  tenantId      String
  tenant        Tenant             @relation(fields: [tenantId], references: [id])
  auditLogs     AuditLog[]
  refreshTokens RefreshToken[]
  conversations ChatConversation[]
  chatMessages  ChatMessage[]
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

// ─── Refresh Token ───────────────────────────────────────────────

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// ─── Document ────────────────────────────────────────────────────

model Document {
  id         String    @id @default(cuid())
  filename   String
  mimeType   String                    // application/pdf | application/vnd...
  minioKey   String                    // path in MinIO bucket
  status     DocStatus @default(PENDING)
  tenantId   String
  tenant     Tenant    @relation(fields: [tenantId], references: [id])
  uploadedBy String                    // userId
  chunkCount Int       @default(0)     // set after processing
  summary    String?                   // LLM-generated summary (2–4 sentences)
  errorMsg   String?                   // populated on FAILED
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([tenantId])
  @@index([status])
}

enum DocStatus {
  PENDING     // just uploaded, in queue
  PROCESSING  // worker picked up the job
  READY       // embedded and stored in Qdrant
  FAILED      // processing error
}

// ─── Audit Log ───────────────────────────────────────────────────

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  action    String                     // e.g. "document.upload", "chat.query"
  resource  String                     // e.g. document ID or "chat"
  metadata  Json?                      // extra context (filename, query text)
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([createdAt(sort: Desc)])
}

// ─── Chat Conversation ───────────────────────────────────────────

model ChatConversation {
  id        String        @id @default(cuid())
  userId    String
  tenantId  String
  title     String?                       // optional label (first question snippet)
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([userId, createdAt(sort: Desc)])
  @@index([tenantId])
}

model ChatMessage {
  id             String           @id @default(cuid())
  conversationId String
  userId         String
  tenantId       String
  role           ChatRole
  content        String
  sources        Json?            // retrieved doc citations for assistant turns
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant         Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt      DateTime         @default(now())

  @@index([conversationId, createdAt])
  @@index([userId])
  @@index([tenantId])
}

enum ChatRole {
  USER
  ASSISTANT
}
```

### 7.1 PostgreSQL SQL Schema (Equivalent)

```sql
CREATE TYPE role AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE doc_status AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role role NOT NULL DEFAULT 'VIEWER',
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  minio_key TEXT NOT NULL,
  status doc_status NOT NULL DEFAULT 'PENDING',
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  uploaded_by TEXT NOT NULL,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE chat_role AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id, created_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## 8. API Reference

### Auth Endpoints

```
POST /api/auth/register
  Body: { email, password, tenantName }
  Returns: { accessToken, refreshToken, user }

POST /api/auth/login
  Body: { email, password }
  Returns: { accessToken, refreshToken, user }

POST /api/auth/refresh
  Body: { refreshToken }
  Returns: { accessToken, refreshToken }

POST /api/auth/logout
  Auth: Bearer token
  Body: { refreshToken }
  Returns: 204 No Content
```

### Document Endpoints

```
GET /api/documents
  Auth: viewer+
  Query: ?page=1&limit=20&status=READY
  Returns: { documents: [...], total, page }

POST /api/documents/upload
  Auth: editor+
  Body: multipart/form-data — file (PDF/DOCX)
  Returns: { document: { id, filename, status: "PENDING" } }

GET /api/documents/:id
  Auth: viewer+
  Returns: { document } — includes summary when status is READY

GET /api/documents/graph
  Auth: viewer+
  Query: ?threshold=0.6&maxNodes=50
  Returns: { nodes: [...], edges: [...], stats: { documentCount, topicCount } }

DELETE /api/documents/:id
  Auth: editor+ (own docs) | admin (any)
  Side effects: removes MinIO file + Qdrant vectors
  Returns: 204 No Content
```

### Chat Endpoints

```
POST /api/chat
  Auth: viewer+
  Body: { question: string, conversationId?: string }
  Response: text/event-stream (SSE)
  Side effects: persists USER + ASSISTANT rows in ChatMessage; optional title on ChatConversation
  Events:
    data: { token: "The", done: false }
    data: { token: " payment", done: false }
    data: { done: true, sources: [{ documentId, filename, chunk }] }

GET /api/chat/conversations
  Auth: viewer+
  Returns: [ { conversationId, lastMessage, createdAt } ]

GET /api/chat/conversations/:id
  Auth: viewer+
  Returns: { messages: [ { role, content, sources } ] }

DELETE /api/chat/conversations/:id
  Auth: viewer+
  Returns: 204 No Content
```

### Search Endpoints

```
GET /api/search
  Auth: viewer+
  Query: ?q=payment+service&limit=10&threshold=0.75
  Returns: {
    results: [
      { score, chunkText, documentId, filename, pageHint }
    ]
  }
```

### User Management (Admin)

```
GET /api/users
  Auth: admin
  Returns: [ { id, email, role, createdAt } ]

PATCH /api/users/:id/role
  Auth: admin
  Body: { role: "EDITOR" | "VIEWER" | "ADMIN" }
  Returns: { user }

DELETE /api/users/:id
  Auth: admin
  Returns: 204 No Content
```

### Audit Logs (Admin)

```
GET /api/audit-logs
  Auth: admin
  Query: ?page=1&limit=50&userId=xxx&action=document.upload
  Returns: { logs: [...], total }
```

---

## 9. Auth & RBAC

### JWT Flow

```
┌─────────┐   POST /auth/login    ┌─────────────┐
│ Browser │ ─────────────────────▶│  Fastify    │
│         │                       │  Auth API   │
│         │◀─────────────────────│             │
│         │  { accessToken (15m)  │  bcrypt     │
│         │    refreshToken (7d) } │  compare    │
└─────────┘                       └─────────────┘
     │
     │  Every request:
     │  Authorization: Bearer <accessToken>
     │
     ▼
┌─────────────────────────────────────┐
│         authenticate middleware     │
│                                     │
│  jwt.verify(token, JWT_SECRET)      │
│  → { userId, tenantId, role, iat }  │
│  inject into req.user               │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│            RBAC middleware          │
│                                     │
│  rbac('EDITOR')                     │
│  → if req.user.role < EDITOR → 403  │
│                                     │
│  Role hierarchy: VIEWER < EDITOR < ADMIN
└─────────────────────────────────────┘
```

### Role Permissions Matrix

| Action | VIEWER | EDITOR | ADMIN |
|---|:---:|:---:|:---:|
| Query / Chat | ✓ | ✓ | ✓ |
| Semantic Search | ✓ | ✓ | ✓ |
| View Documents | ✓ | ✓ | ✓ |
| Upload Documents | ✗ | ✓ | ✓ |
| Delete Own Documents | ✗ | ✓ | ✓ |
| Delete Any Document | ✗ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✓ |
| View Audit Logs | ✗ | ✗ | ✓ |
| Change Roles | ✗ | ✗ | ✓ |

### RBAC Implementation (Fastify)

```js
// middleware/rbac.js

const ROLE_RANK = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

export function rbac(minRole) {
  return async function (req, reply) {
    const userRank = ROLE_RANK[req.user.role];
    const required = ROLE_RANK[minRole];
    if (userRank < required) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}

// Usage on a route:
fastify.delete('/documents/:id', {
  preHandler: [authenticate, rbac('EDITOR')],
}, documentsController.delete);
```

---

## 10. Multi-Tenancy

Every piece of data is scoped to a **Tenant**. Isolation is enforced at two layers:

### Layer 1 — PostgreSQL Row-Level Isolation

Every query filters by `tenantId` injected from the JWT:

```js
// middleware/tenant.js
export async function tenantMiddleware(req) {
  req.tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: req.user.tenantId },
  });
}

// In any service:
const docs = await prisma.document.findMany({
  where: { tenantId: req.tenant.id },  // always scoped
});
```

### Layer 2 — Qdrant Collection per Tenant

Each tenant gets its own Qdrant collection. No cross-tenant vector leakage is possible:

```js
// qdrant.client.js

const collectionName = (tenantId) => `tenant_${tenantId}`;

export async function searchVectors(tenantId, queryVector, topK = 5) {
  return qdrantClient.search(collectionName(tenantId), {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });
}

export async function upsertVectors(tenantId, points) {
  await qdrantClient.upsert(collectionName(tenantId), {
    wait: true,
    points,
  });
}

export async function ensureCollection(tenantId) {
  const name = collectionName(tenantId);
  const exists = await qdrantClient.collectionExists(name);
  if (!exists) {
    await qdrantClient.createCollection(name, {
      vectors: { size: 768, distance: 'Cosine' },
    });
  }
}
```

---

## 11. Document Processing Pipeline

### BullMQ Worker Setup

```js
// processor/processor.worker.js

import { Worker } from 'bullmq';
import { parseDocument } from './parser.service.js';
import { chunkText } from './chunker.js';
import { embedChunks } from './embedder.js';
import { qdrantClient } from '../search/qdrant.client.js';
import { prisma } from '../../plugins/prisma.js';

const worker = new Worker(
  'document-processing',
  async (job) => {
    const { documentId, tenantId } = job.data;

    // 1. Update status → PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    // 2. Fetch file from MinIO
    const fileBuffer = await minioClient.getObject('documents', documentId);

    // 3. Parse text
    const rawText = await parseDocument(fileBuffer, job.data.mimeType);

    // 4. Chunk
    const chunks = await chunkText(rawText, {
      chunkSize: 500,
      chunkOverlap: 50,
    });

    // 5. Embed all chunks
    const vectors = await embedChunks(chunks);

    // 6. Ensure Qdrant collection exists
    await qdrantClient.ensureCollection(tenantId);

    // 7. Upsert to Qdrant
    const points = chunks.map((chunk, i) => ({
      id: crypto.randomUUID(),
      vector: vectors[i],
      payload: {
        chunkText: chunk,
        documentId,
        tenantId,
        filename: job.data.filename,
        chunkIndex: i,
      },
    }));
    await qdrantClient.upsertVectors(tenantId, points);

    // 8. Update status → READY
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY', chunkCount: chunks.length },
    });
  },
  {
    connection: redisConnection,
    concurrency: 3,               // process 3 docs at once
    limiter: { max: 10, duration: 60_000 },  // max 10/minute
  }
);

worker.on('failed', async (job, err) => {
  await prisma.document.update({
    where: { id: job.data.documentId },
    data: { status: 'FAILED', errorMsg: err.message },
  });
});
```

### Text Chunker

```js
// processor/chunker.js

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export async function chunkText(text, { chunkSize = 500, chunkOverlap = 50 } = {}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });
  const docs = await splitter.createDocuments([text]);
  return docs.map((d) => d.pageContent);
}
```

### Embedder (Ollama)

```js
// processor/embedder.js

export async function embedChunks(chunks) {
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetch('http://ollama:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', prompt: chunk }),
      })
        .then((r) => r.json())
        .then((r) => r.embedding)
    )
  );
  return results;  // float32[][] — one vector per chunk
}
```

### Document Summarization

After chunking and embedding, the worker calls Ollama to produce a **2–4 sentence summary** of the extracted text. The result is stored on `Document.summary`. Summarization failure is non-fatal — the document still reaches `READY` status.

The frontend Documents page exposes summaries via an expandable **View summary** row on each ready document card.

---

## 12. Chat & Streaming

Chat messages are persisted in PostgreSQL via **`ChatConversation`** and **`ChatMessage`**. Each SSE turn stores a `USER` row and an `ASSISTANT` row (with optional `sources` JSON). Related past Q&A is also indexed in Qdrant for long-term memory across sessions.

### RAG Chain (LangChain.js)

```js
// chat/rag.chain.js

import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { Ollama } from '@langchain/community/llms/ollama';
import { PromptTemplate } from '@langchain/core/prompts';

const SYSTEM_PROMPT = `You are a helpful internal knowledge assistant.
Answer the question using ONLY the context provided below.
If the answer is not in the context, say "I don't have information about that in the company docs."
Always cite which document your answer comes from.

Context:
{context}

Question: {question}
Answer:`;

export async function runRAGChain({ tenantId, query, onToken }) {
  // 1. Embed the query
  const embeddings = new OllamaEmbeddings({
    model: 'nomic-embed-text',
    baseUrl: 'http://ollama:11434',
  });

  // 2. Retrieve from Qdrant
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: 'http://qdrant:6333',
    collectionName: `tenant_${tenantId}`,
  });
  const retrievedDocs = await vectorStore.similaritySearch(query, 5);

  // 3. Build context string
  const context = retrievedDocs
    .map((d, i) => `[${i + 1}] ${d.pageContent}`)
    .join('\n\n');

  // 4. Build prompt
  const prompt = await PromptTemplate.fromTemplate(SYSTEM_PROMPT).format({
    context,
    question: query,
  });

  // 5. Stream from Ollama
  const llm = new Ollama({
    model: 'llama3.3',
    baseUrl: 'http://ollama:11434',
    streaming: true,
  });

  const stream = await llm.stream(prompt);
  for await (const chunk of stream) {
    onToken(chunk);  // caller writes to SSE stream
  }

  return retrievedDocs.map((d) => d.metadata);  // source citations
}
```

### SSE Controller

```js
// chat/chat.controller.js

export async function chatHandler(req, reply) {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders();

  const send = (data) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const sources = await runRAGChain({
      tenantId: req.tenant.id,
      query: req.body.query,
      onToken: (token) => send({ token, done: false }),
    });

    send({ done: true, sources });
  } catch (err) {
    send({ error: err.message, done: true });
  } finally {
    reply.raw.end();
  }
}
```

### Frontend SSE Consumer

```ts
// hooks/useChat.ts

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);

  const sendMessage = useCallback(async (query: string) => {
    setStreaming(true);
    let buffer = '';

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({ query }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice(6));

        if (event.token) {
          buffer += event.token;
          setMessages((prev) => updateLastMessage(prev, buffer));
        }
        if (event.done) {
          setStreaming(false);
          if (event.sources) attachSources(event.sources);
        }
      }
    }
  }, []);

  return { messages, sendMessage, streaming };
}
```

---

## 13. Audit Logging

Every authenticated action is logged. The middleware runs as a Fastify `onResponse` hook so it captures the outcome (status code) too.

```js
// audit/audit.middleware.js

export function auditMiddleware(fastify) {
  fastify.addHook('onResponse', async (req, reply) => {
    if (!req.user) return;  // skip unauthenticated routes

    const action = deriveAction(req.method, req.url);
    if (!action) return;    // skip read-only GETs you don't want to log

    await auditService.log({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action,                         // e.g. "document.upload"
      resource: req.params?.id ?? req.url,
      metadata: {
        statusCode: reply.statusCode,
        body: sanitize(req.body),     // strip passwords, tokens
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
}

function deriveAction(method, url) {
  if (method === 'POST' && url.includes('/documents/upload')) return 'document.upload';
  if (method === 'DELETE' && url.includes('/documents')) return 'document.delete';
  if (method === 'POST' && url.includes('/chat')) return 'chat.query';
  if (method === 'PATCH' && url.includes('/users')) return 'user.role_change';
  return null;
}
```

---

## 14. Docker Services

The repo ships **`apps/backend/docker-compose.yml`** for the three queue/storage services the API worker depends on at runtime:

| Service | In `docker-compose.yml` | Port | Purpose |
|---|---|---|---|
| Redis | Yes | 6379 | BullMQ job queue |
| MinIO | Yes | 9000 / 9001 | File blob storage |
| Qdrant | Yes | 6333 / 6334 | Vector search |
| PostgreSQL | **Manual setup** | 5432 | Relational metadata (users, docs, chat, audit) |
| Ollama | **Manual setup** | 11434 | LLM chat + embeddings |

Start the Docker-managed services from `apps/backend`:

```powershell
cd apps/backend
npm run docker:infra
# equivalent: docker compose up -d redis minio qdrant
```

**PostgreSQL and Ollama are not included in this compose file.** Install and run them on the host (or in your own containers) — see [Section 20 — Manual Setup](#20-manual-setup--postgresql--ollama).

Reference compose file (Redis, MinIO, Qdrant only — as shipped):

```yaml
# apps/backend/docker-compose.yml (reference — Redis, MinIO, Qdrant)

services:

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web console
    volumes:
      - minio_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    restart: unless-stopped
    ports:
      - "6333:6333"   # REST API
      - "6334:6334"   # gRPC
    volumes:
      - qdrant_storage:/qdrant/storage

volumes:
  redis_data:
  minio_data:
  qdrant_storage:
```

Optional — run PostgreSQL and Ollama in Docker yourself (not in the shipped compose file):

```yaml
# add to your local override or a separate compose file

  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: enterprise_kb
      POSTGRES_USER: kb_user
      POSTGRES_PASSWORD: kb_pass
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  ollama:
    image: ollama/ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama
    # GPU support (uncomment if you have NVIDIA):
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

volumes:
  pg_data:
  ollama_models:
```

---

## 15. Key npm Packages

### Backend — `apps/backend/package.json`

```json
{
  "dependencies": {
    "fastify": "^5.8.5",
    "@fastify/multipart": "^10.0.0",
    "@fastify/cors": "^11.2.0",
    "@fastify/jwt": "^10.0.0",
    "@prisma/client": "^7.8.0",
    "bullmq": "^5.76.8",
    "ioredis": "^5.10.1",
    "minio": "^8.0.0",
    "langchain": "^1.4.0",
    "@langchain/core": "^1.1.46",
    "@langchain/community": "^1.1.28",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.8.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^3.0.2",
    "zod": "^4.4.3",
    "dotenv": "^16.5.0"
  },
  "devDependencies": {
    "prisma": "^7.8.0",
    "nodemon": "^3.1.0"
  }
}
```

### Frontend — `apps/frontend/package.json`

```json
{
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "@tanstack/react-query": "^5.100.10",
    "axios": "^1.15.0",
    "react-dropzone": "^14.3.0",
    "eventsource-parser": "^3.0.0",
    "lucide-react": "^1.11.0",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "tailwindcss": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.5.0",
    "@types/react": "^19.1.0",
    "@types/node": "^24.0.0"
  }
}
```

---

## 16. Getting Started

### Prerequisites

- Docker Desktop (latest)
- Node.js 24 LTS
- npm 10+

### Step 1 — Clone and install

```bash
git clone https://github.com/yourname/enterprise-kb.git
cd enterprise-kb

# Install backend deps
cd apps/backend && npm install && cd ../..

# Install frontend deps
cd apps/frontend && npm install && cd ../..
```

### Step 2 — Configure environment

```powershell
cd apps/backend
Copy-Item .env.example .env
# Edit .env — see Section 17 (DATABASE_URL, Ollama model names, JWT secrets)

cd ../frontend
Copy-Item .env.local.example .env.local
```

### Step 3 — PostgreSQL (manual)

Install PostgreSQL 17 locally, or run it in Docker (see [Section 20](#20-manual-setup--postgresql--ollama)).

Create the database and user to match `DATABASE_URL` in `.env`:

```sql
CREATE USER kb_user WITH PASSWORD 'kb_pass';
CREATE DATABASE enterprise_kb OWNER kb_user;
```

Apply the schema:

```powershell
cd apps/backend
npx prisma generate
npx prisma db push
# optional seed: npx prisma db seed
```

### Step 4 — Ollama (manual)

Install [Ollama](https://ollama.com) on the host and pull the models referenced in `.env`:

```powershell
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

Verify Ollama is listening at `http://localhost:11434`.

### Step 5 — Start Docker infrastructure (Redis, MinIO, Qdrant)

```powershell
cd apps/backend
npm run docker:infra

# Verify three containers are running:
docker compose ps
```

### Step 6 — Pull Ollama models (Docker install only)

Skip this step if you installed Ollama on the host in Step 4. If Ollama runs in Docker:

```powershell
docker exec -it <ollama-container-name> ollama pull llama3.1:8b
docker exec -it <ollama-container-name> ollama pull nomic-embed-text
```

### Step 7 — Create MinIO bucket

```bash
# Open MinIO console at http://localhost:9001
# Login: minioadmin / minioadmin123
# Create bucket: "documents"
```

### Step 8 — Start the backend

```powershell
cd apps/backend
npm run dev:all
# Starts API (port 3001) and document-processing worker together
```

### Step 9 — Start the frontend

```powershell
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

### Step 10 — Register and test

1. Open `http://localhost:3000/register`
2. Create an account (first user in a new tenant becomes Admin)
3. Upload a PDF from the Documents page
4. Wait for status to change to **READY** (~10–30 seconds)
5. Expand **View summary** on the document card (if summarization succeeded)
6. Go to **Chat** and ask a question about the document
7. Open **Knowledge Graph** to explore document ↔ topic relationships

---

## 17. Environment Variables

```bash
# apps/backend/.env

# Database
DATABASE_URL="postgresql://kb_user:kb_pass@localhost:5432/enterprise_kb"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# Redis (BullMQ)
REDIS_URL="redis://localhost:6379"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin123"
MINIO_BUCKET="documents"

# Qdrant
QDRANT_URL="http://localhost:6333"

# Ollama
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_CHAT_MODEL="llama3.1:8b"
OLLAMA_EMBED_MODEL="nomic-embed-text"

# App
PORT="3001"
NODE_ENV="development"
```

```bash
# apps/frontend/.env.local

NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

## 18. Resume Highlights

This project demonstrates the following skills interviewers look for:

| Skill | How It's Demonstrated |
|---|---|
| **RAG Pipeline** | End-to-end: LangChain.js chunking → Ollama embeddings → Qdrant retrieval → LLM generation |
| **Vector Database** | Qdrant with cosine similarity, tenant-scoped collections, metadata filters |
| **Local LLM Integration** | Ollama API for both generation (llama3) and embeddings (nomic-embed-text) |
| **Scalable Async Processing** | BullMQ workers with concurrency, rate limiting, and dead-letter queue |
| **Multi-Tenancy** | Row-level DB isolation + per-tenant Qdrant collection — enterprise-grade |
| **Auth System** | JWT access/refresh token rotation, bcrypt password hashing |
| **RBAC** | Role guard middleware factory — Admin / Editor / Viewer hierarchy |
| **Streaming AI** | Server-Sent Events for real-time token-by-token LLM output |
| **Audit Compliance** | Immutable append-only action log — satisfies SOC2/GDPR audit requirements |
| **Document Processing** | Binary file → text → structured chunks → searchable vectors + optional summary |
| **Knowledge Graph** | Document/chunk/topic nodes with similarity edges — interactive 2D visualization |
| **Full-Stack JS** | Next.js App Router + Fastify API + Prisma ORM — all JavaScript |
| **Infrastructure** | Docker Compose for Redis/MinIO/Qdrant; PostgreSQL + Ollama run manually on host |
| **API Design** | RESTful endpoints with proper HTTP verbs, status codes, pagination |

---

## 19. Knowledge Graph

The Knowledge Graph visualizes how indexed documents relate to each other through **shared topics** extracted from chunk text and document summaries.

### What it shows

| Node type | Description |
|---|---|
| `document` | One node per `READY` document (label = filename, includes `summary`) |
| `chunk` | Representative text chunks linked to their parent document |
| `topic` | Shared phrases/keywords that appear across multiple documents |

| Edge type | Description |
|---|---|
| `contains` | Document → chunk ownership |
| `mentions` | Document or chunk → shared topic (weighted by relevance) |
| `related` | Document ↔ document when topic overlap exceeds `threshold` |

### Backend — `graph.service.js`

```
GET /api/documents/graph?threshold=0.6&maxNodes=50
        │
        ▼
  Load READY documents for tenant (Postgres)
        │
        ▼
  For each document: scroll Qdrant chunks + read Document.summary
        │
        ▼
  Extract phrases/keywords → build topic index
        │
        ▼
  Emit { nodes[], edges[], stats } for force-graph rendering
```

Query parameters:

- `threshold` (0.1–0.99, default `0.6`) — minimum topic overlap to draw a document–document edge
- `maxNodes` (1–100, default `50`) — cap total nodes returned

### Frontend — `/graph`

- **`KnowledgeGraph.tsx`** — `react-force-graph-2d` canvas; click nodes to inspect details
- **`NodePanel.tsx`** — side panel showing filename, summary, chunk text, or topic metadata
- **`useGraph.ts`** — fetches graph payload and manages loading/error state

The graph page is linked from the dashboard sidebar as **Knowledge Graph**.

---

## 20. Manual Setup — PostgreSQL & Ollama

PostgreSQL and Ollama are **required** but intentionally **outside** `apps/backend/docker-compose.yml`. Run them on the host or in your own containers.

### PostgreSQL

**Option A — Local install (Windows / macOS / Linux)**

1. Install PostgreSQL 17 from [postgresql.org](https://www.postgresql.org/download/) or your package manager.
2. Create database and user (match `DATABASE_URL` in `apps/backend/.env`):

```sql
CREATE USER kb_user WITH PASSWORD 'kb_pass';
CREATE DATABASE enterprise_kb OWNER kb_user;
```

3. Apply schema:

```powershell
cd apps/backend
npx prisma generate
npx prisma db push
```

**Option B — Docker (standalone container)**

```powershell
docker run -d --name enterprise-kb-postgres `
  -e POSTGRES_DB=enterprise_kb `
  -e POSTGRES_USER=kb_user `
  -e POSTGRES_PASSWORD=kb_pass `
  -p 5432:5432 `
  -v pg_data:/var/lib/postgresql/data `
  postgres:17-alpine
```

Then run `npx prisma db push` from `apps/backend`.

**Verify:** `psql postgresql://kb_user:kb_pass@localhost:5432/enterprise_kb -c "\dt"`

### Ollama

**Option A — Host install (recommended for GPU access)**

1. Download from [ollama.com](https://ollama.com) and start the Ollama service.
2. Pull models (names must match `OLLAMA_CHAT_MODEL` and `OLLAMA_EMBED_MODEL` in `.env`):

```powershell
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

3. Confirm the API responds:

```powershell
curl http://localhost:11434/api/tags
```

**Option B — Docker**

```powershell
docker run -d --name enterprise-kb-ollama `
  -p 11434:11434 `
  -v ollama_models:/root/.ollama `
  ollama/ollama

docker exec -it enterprise-kb-ollama ollama pull llama3.1:8b
docker exec -it enterprise-kb-ollama ollama pull nomic-embed-text
```

Set `OLLAMA_BASE_URL=http://localhost:11434` in `apps/backend/.env`.

### Startup order

```
1. PostgreSQL  →  prisma db push
2. Ollama      →  pull chat + embed models
3. Docker infra →  npm run docker:infra  (Redis, MinIO, Qdrant)
4. MinIO bucket →  create "documents" at http://localhost:9001
5. Backend     →  npm run dev:all  (API + worker)
6. Frontend    →  npm run dev
```

---

## 21. Remaining Development

Items still worth tackling (core RAG flow is already implemented):

| Priority | Item | Notes |
|---|---|---|
| High | Root monorepo docs | Add root `README.md` + `.env.example` pointing to `apps/backend` and `apps/frontend` |
| High | API pagination & filters | `GET /api/documents` status/page filters; richer audit log query params |
| Medium | RBAC polish | Editor deletes own docs only; hide Users/Audit sidebar links for non-admins |
| Medium | Search API | Optional `threshold` filter; align query param naming with frontend |
| Low | Doc ↔ code alignment | Package versions in this file vs `package.json`; optional full LangChain chain |
| Low | `ENTERPRISE_KB.md` upkeep | Keep schema, API paths, and infra steps in sync as features evolve |

**Explicitly out of scope for now:** committed Prisma migration history and automated test suites.

---

*Built with: Next.js 15 · Fastify 5 · Prisma 7 · PostgreSQL 17 · Qdrant · BullMQ 5 · Redis 7 · MinIO · Ollama · LangChain.js 1.x*
