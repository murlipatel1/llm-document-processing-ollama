import {
  listDocuments,
  getDocumentById,
  deleteDocument,
  reprocessDocument,
  uploadAndCreateDocument
} from "./documents.service.js";

export async function listDocumentsHandler(request, reply) {
  const items = await listDocuments(this, request.tenantId);
  return reply.send({ items });
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
