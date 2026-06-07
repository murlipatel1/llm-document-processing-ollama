import { PrismaClient } from "@prisma/client";
import { getObjectBuffer } from "../../lib/minio-storage.js";
import { ollamaEmbed } from "../../lib/ollama-client.js";
import { parseDocumentFromBuffer } from "../documents/parser.service.js";
import { splitTextIntoChunks } from "./chunker.js";
import { buildPoint, upsertVectors } from "../search/qdrant.client.js";
import { SUPPORTED_MIME_TYPES, SUPPORTED_MIME_TYPES_LABEL } from "../../config/constants.js";

const prisma = new PrismaClient();

export async function processDocumentJob({ documentId, tenantId }) {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING", errorMsg: null }
  });

  const document = await prisma.document.findFirst({
    where: { id: documentId, tenantId }
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Second-line defence: reject unsupported types before downloading the file.
  // Protects against files that were queued before API-level validation existed.
  if (!SUPPORTED_MIME_TYPES.has(document.mimeType)) {
    throw new Error(
      `Unsupported file type "${document.mimeType}". Supported: ${SUPPORTED_MIME_TYPES_LABEL}`
    );
  }

  const fileBuffer = await getObjectBuffer(document.minioKey);
  const parsed = await parseDocumentFromBuffer(fileBuffer, document.mimeType);
  const chunks = await splitTextIntoChunks(parsed.text, 800);

  if (!chunks.length) {
    throw new Error("No text could be extracted from the document");
  }

  const points = [];

  for (let i = 0; i < chunks.length; i++) {
    const vector = await ollamaEmbed(chunks[i]);
    if (!vector.length) {
      throw new Error(
        `Embedding failed for chunk ${i + 1}. Run: ollama pull ${process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text"}`
      );
    }

    points.push(
      buildPoint({
        vector,
        chunkText: chunks[i],
        documentId: document.id,
        tenantId,
        filename: document.filename,
        chunkIndex: i
      })
    );
  }

  await upsertVectors(tenantId, points);

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "READY", chunkCount: chunks.length, errorMsg: null }
  });

  return { chunkCount: chunks.length };
}

export async function markDocumentFailed(documentId, errorMsg) {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "FAILED", errorMsg: errorMsg.slice(0, 500) }
  });
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
