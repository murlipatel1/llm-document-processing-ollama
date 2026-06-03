import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Minimum cosine similarity (0-1) for a past Q&A to be considered relevant.
 * Raise to 0.88 for stricter matching, lower to 0.76 for broader recall.
 */
const HISTORY_MIN_SCORE = 0.82;

function chatCollectionName(tenantId) {
  return `chathistory_${tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function qdrantRequest(path, options = {}) {
  const response = await fetch(`${env.QDRANT_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qdrant chat-history error (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function ensureChatCollection(tenantId) {
  const name = chatCollectionName(tenantId);

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

/**
 * Index a completed Q&A turn so it can be retrieved in future sessions.
 * The question text is embedded (vector already computed) and stored alongside
 * a truncated answer in the payload.
 */
export async function indexChatTurn({ tenantId, userId, conversationId, question, answer, vector }) {
  if (!vector?.length) return;

  const name = await ensureChatCollection(tenantId);

  await qdrantRequest(`/collections/${name}/points?wait=false`, {
    method: "PUT",
    body: JSON.stringify({
      points: [
        {
          id: randomUUID(),
          vector,
          payload: {
            question: question.slice(0, 500),
            answer: answer.slice(0, 800),
            userId,
            tenantId,
            conversationId
          }
        }
      ]
    })
  });
}

/**
 * Semantic search over this user's past Q&A turns.
 * Returns turns whose question is semantically similar to the current query,
 * excluding the active conversation to prevent self-reference.
 */
export async function searchChatHistory(
  tenantId,
  userId,
  queryVector,
  { limit = 3, excludeConversationId } = {}
) {
  if (!queryVector?.length) return [];

  const name = chatCollectionName(tenantId);

  try {
    await qdrantRequest(`/collections/${name}`);
  } catch {
    return [];
  }

  const filter = {
    must: [{ key: "userId", match: { value: userId } }]
  };

  if (excludeConversationId) {
    filter.must_not = [{ key: "conversationId", match: { value: excludeConversationId } }];
  }

  const result = await qdrantRequest(`/collections/${name}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector: queryVector,
      limit,
      with_payload: true,
      score_threshold: HISTORY_MIN_SCORE,
      filter
    })
  });

  return (result.result || []).map((hit) => ({
    score: hit.score,
    question: hit.payload?.question || "",
    answer: hit.payload?.answer || ""
  }));
}

/**
 * Remove all indexed turns for a conversation (called on conversation delete).
 */
export async function deleteChatHistoryByConversation(tenantId, conversationId) {
  const name = chatCollectionName(tenantId);

  try {
    await qdrantRequest(`/collections/${name}`);
  } catch {
    return;
  }

  await qdrantRequest(`/collections/${name}/points/delete?wait=false`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        must: [{ key: "conversationId", match: { value: conversationId } }]
      }
    })
  });
}
