import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Minimum cosine similarity (0-1) for a past Q&A to be considered relevant.
 * Raise to 0.88 for stricter matching, lower to 0.76 for broader recall.
 */
const HISTORY_MIN_SCORE = 0.82;

const HISTORY_MAX_AGE_DAYS = env.CHAT_HISTORY_MAX_AGE_DAYS;

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
 * Delete all chat-history turns for a user that are older than
 * HISTORY_MAX_AGE_DAYS. Runs fire-and-forget (non-blocking) after each
 * new turn is indexed.
 *
 * Uses a Unix-second `createdAt` field stored in every point payload so
 * Qdrant's range filter can target stale points directly.
 */
function staleHistoryCutoffSec() {
  return Math.floor(Date.now() / 1000) - HISTORY_MAX_AGE_DAYS * 86400;
}

async function pruneStaleHistory(tenantId, userId, { log } = {}) {
  const name = chatCollectionName(tenantId);
  const cutoffSec = staleHistoryCutoffSec();

  try {
    await qdrantRequest(`/collections/${name}/points/delete?wait=false`, {
      method: "POST",
      body: JSON.stringify({
        filter: {
          must: [
            { key: "userId", match: { value: userId } },
            { key: "createdAt", range: { lt: cutoffSec } }
          ]
        }
      })
    });
  } catch (err) {
    log?.warn?.({ err, tenantId, userId }, "Per-user chat history prune failed");
  }
}

/**
 * Tenant-wide age prune — catches inactive users who never trigger lazy pruning.
 */
export async function pruneStaleHistoryForTenant(tenantId, { log } = {}) {
  const name = chatCollectionName(tenantId);
  const cutoffSec = staleHistoryCutoffSec();

  try {
    await qdrantRequest(`/collections/${name}`);
  } catch {
    return;
  }

  await qdrantRequest(`/collections/${name}/points/delete?wait=true`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        must: [{ key: "createdAt", range: { lt: cutoffSec } }]
      }
    })
  });

  log?.info?.({ tenantId, cutoffSec }, "Tenant chat history pruned");
}

/**
 * Index a completed Q&A turn so it can be retrieved in future sessions.
 * The question text is embedded (vector already computed) and stored alongside
 * a truncated answer in the payload.
 *
 * Each point is stamped with a `createdAt` Unix timestamp. After indexing,
 * stale turns (older than HISTORY_MAX_AGE_DAYS) are pruned asynchronously
 * so the collection never grows unbounded.
 */
export async function indexChatTurn({ tenantId, userId, conversationId, question, answer, vector }) {
  if (!vector?.length) return;

  const name = await ensureChatCollection(tenantId);
  const createdAt = Math.floor(Date.now() / 1000);

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
            conversationId,
            createdAt
          }
        }
      ]
    })
  });

  // Non-blocking prune — do not await so the response path is unaffected.
  pruneStaleHistory(tenantId, userId).catch(() => undefined);
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
