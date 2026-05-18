import { uploadObject } from "../../lib/minio-storage.js";

export async function listDocuments(fastify, tenantId) {
  return fastify.prisma.document.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" }
  });
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
