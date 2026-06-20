import {
  listDocuments,
  getDocumentById,
  deleteDocument,
  reprocessDocument,
  uploadAndCreateDocument
} from "./documents.service.js";
import { buildDocumentGraph } from "./graph.service.js";
import { getObjectStream, getObjectBuffer } from "../../lib/minio-storage.js";
import { parseDocumentFromBuffer } from "./parser.service.js";
import { SUPPORTED_MIME_TYPES, SUPPORTED_MIME_TYPES_LABEL } from "../../config/constants.js";

const PREVIEW_AS_EXTRACTED_TEXT = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export async function listDocumentsHandler(request, reply) {
  const items = await listDocuments(this, request.tenantId);
  return reply.send({ items });
}

export async function graphDocumentsHandler(request, reply) {
  const rawThreshold = parseFloat(request.query?.threshold ?? "0.6");
  const rawMaxNodes = parseInt(request.query?.maxNodes ?? "50", 10);

  const threshold = Number.isFinite(rawThreshold)
    ? Math.min(0.99, Math.max(0.1, rawThreshold))
    : 0.6;
  const maxNodes = Number.isFinite(rawMaxNodes)
    ? Math.min(100, Math.max(1, rawMaxNodes))
    : 50;

  const graph = await buildDocumentGraph(this, request.tenantId, { threshold, maxNodes });
  return reply.send(graph);
}

export async function createDocumentHandler(request, reply) {
  const file = await request.file();

  if (!file) {
    throw this.httpErrors.badRequest("File is required");
  }

  const buffer = await file.toBuffer();
  const filename = file.filename || "document";
  const mimeType = file.mimetype || "application/octet-stream";

  if (!buffer.length) {
    throw this.httpErrors.badRequest("Uploaded file is empty");
  }

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw this.httpErrors.unsupportedMediaType(
      `Unsupported file type "${mimeType}". Allowed: ${SUPPORTED_MIME_TYPES_LABEL}`
    );
  }

  const item = await uploadAndCreateDocument(this, {
    tenantId: request.tenantId,
    uploadedBy: request.user?.sub || "unknown",
    filename,
    mimeType,
    buffer
  });

  return reply.status(201).send(item);
}

export async function getDocumentHandler(request, reply) {
  const item = await getDocumentById(this, request.params.id, request.tenantId);
  return reply.send(item);
}

export async function deleteDocumentHandler(request, reply) {
  const result = await deleteDocument(this, request.params.id, request.tenantId);
  return reply.send(result);
}

export async function reprocessDocumentHandler(request, reply) {
  const result = await reprocessDocument(this, request.params.id, request.tenantId);
  return reply.send(result);
}

export async function downloadDocumentHandler(request, reply) {
  const document = await getDocumentById(this, request.params.id, request.tenantId);
  const stream = await getObjectStream(document.minioKey);
  const safeName = document.filename.replace(/["\\]/g, "_");
  reply.header("Content-Disposition", `attachment; filename="${safeName}"`);
  reply.header("Content-Type", document.mimeType || "application/octet-stream");
  reply.header("Cache-Control", "no-store");
  return reply.send(stream);
}

export async function previewDocumentHandler(request, reply) {
  const document = await getDocumentById(this, request.params.id, request.tenantId);
  const mimeType = document.mimeType || "application/octet-stream";
  const safeName = document.filename.replace(/["\\]/g, "_");

  if (PREVIEW_AS_EXTRACTED_TEXT.has(mimeType)) {
    const buffer = await getObjectBuffer(document.minioKey);
    const { text } = await parseDocumentFromBuffer(buffer, mimeType);
    reply.header("Content-Type", "text/plain; charset=utf-8");
    reply.header("Content-Disposition", `inline; filename="${safeName}.txt"`);
    reply.header("Cache-Control", "no-store");
    return reply.send(text || "(No extractable text in this document.)");
  }

  const stream = await getObjectStream(document.minioKey);
  reply.header("Content-Disposition", `inline; filename="${safeName}"`);
  reply.header("Content-Type", mimeType);
  reply.header("Cache-Control", "no-store");
  return reply.send(stream);
}
