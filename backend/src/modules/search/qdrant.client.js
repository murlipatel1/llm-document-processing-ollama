import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";

function collectionName(tenantId) {
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function qdrantRequest(path, options = {}) {
  const response = await fetch(`${env.QDRANT_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qdrant error (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function ensureCollection(tenantId) {
  const name = collectionName(tenantId);

  try {
    await qdrantRequest(`/collections/${name}`);
    return name;
  } catch {
    await qdrantRequest(`/collections/${name}`, {
      method: "PUT",
      body: JSON.stringify({
        vectors: {
          size: env.QDRANT_VECTOR_SIZE,
          distance: "Cosine"
        }
      })
    });
    return name;
  }
}

export async function upsertVectors(tenantId, points) {
  if (!points.length) return;

  const name = await ensureCollection(tenantId);

  await qdrantRequest(`/collections/${name}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({ points })
  });
}

export async function searchInQdrant(tenantId, queryVector, limit = 5) {
  if (!queryVector?.length) return [];

  const name = collectionName(tenantId);

  try {
    await qdrantRequest(`/collections/${name}`);
  } catch {
    return [];
  }

  const result = await qdrantRequest(`/collections/${name}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector: queryVector,
      limit,
      with_payload: true
    })
  });

  return (result.result || []).map((hit) => ({
    id: String(hit.id),
    score: hit.score,
    text: hit.payload?.chunkText || "",
    documentId: hit.payload?.documentId || "",
    filename: hit.payload?.filename || ""
  }));
}

export function buildPoint({ vector, chunkText, documentId, tenantId, filename, chunkIndex }) {
  return {
    id: randomUUID(),
    vector,
    payload: {
      chunkText,
      documentId,
      tenantId,
      filename,
      chunkIndex
    }
  };
}
