import { uploadObject, deleteObject } from "../../lib/minio-storage.js";
import { deletePointsByDocumentId } from "../search/qdrant.client.js";

export async function listDocuments(fastify, tenantId) {
  return fastify.prisma.document.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" }
  });
}

export async function getDocumentById(fastify, documentId, tenantId) {
  const document = await fastify.prisma.document.findFirst({
    where: { id: documentId, tenantId }
  });
  if (!document) throw fastify.httpErrors.notFound("Document not found");
  return document;
}

export async function deleteDocument(fastify, documentId, tenantId) {
  const document = await fastify.prisma.document.findFirst({
    where: { id: documentId, tenantId }
  });
  if (!document) throw fastify.httpErrors.notFound("Document not found");

  const cleanups = [];

  if (document.minioKey) {
    cleanups.push(
      deleteObject(document.minioKey).catch((err) =>
        fastify.log.warn({ err, key: document.minioKey }, "MinIO delete failed")
      )
    );
  }

  cleanups.push(
    deletePointsByDocumentId(tenantId, documentId).catch((err) =>
      fastify.log.warn({ err, documentId }, "Qdrant delete failed")
    )
  );

  await Promise.all(cleanups);
  await fastify.prisma.document.delete({ where: { id: documentId } });

  return { id: documentId, deleted: true };
}

export async function uploadAndCreateDocument(
  fastify,
  { tenantId, uploadedBy, filename, mimeType, buffer }
) {
  const minioKey = `${tenantId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await uploadObject(minioKey, buffer, mimeType);

  const document = await fastify.prisma.document.create({
    data: {
      filename,
      mimeType,
      minioKey,
      tenantId,
      uploadedBy,
      status: "PENDING"
    }
  });

  await fastify.documentQueue.add(
    "process-document",
    { documentId: document.id, tenantId },
    { removeOnComplete: 100, removeOnFail: 200 }
  );

  return document;
}

export async function reprocessDocument(fastify, documentId, tenantId) {
  const document = await fastify.prisma.document.findFirst({
    where: { id: documentId, tenantId }
  });

  if (!document) {
    throw fastify.httpErrors.notFound("Document not found");
  }

  if (document.status === "PROCESSING") {
    throw fastify.httpErrors.conflict("Document is already being processed");
  }

  await fastify.prisma.document.update({
    where: { id: documentId },
    data: { status: "PENDING", errorMsg: null }
  });

  await fastify.documentQueue.add(
    "process-document",
    { documentId: document.id, tenantId },
    { removeOnComplete: 100, removeOnFail: 200 }
  );

  return { id: documentId, status: "PENDING" };
}
