import { createEmbedding } from "../processor/embedder.js";
import { searchInQdrant } from "../search/qdrant.client.js";
import { deleteChatHistoryByConversation, searchChatHistory } from "./chat-history.qdrant.js";

function normalizeSources(hits) {
  return hits.map((hit) => ({
    documentId: hit.documentId,
    filename: hit.filename,
    score: hit.score
  }));
}

/**
 * Fetch the last N messages of a conversation (chronological order).
 * Used to give the LLM short-term memory within the current thread.
 */
async function getRecentConversationMessages(fastify, conversationId, limit = 6) {
  if (!conversationId) return [];

  try {
    const messages = await fastify.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return messages.reverse();
  } catch {
    return [];
  }
}

/**
 * Build an enriched RAG prompt with three context layers:
 *   1. Recent messages from the current conversation (short-term memory)
 *   2. Relevant document chunks from the knowledge base
 *   3. Semantically similar Q&A from the user's past sessions (long-term memory)
 *
 * The question is embedded once and the vector is reused for both
 * the document search and the chat-history search (run in parallel).
 */
async function buildRagPrompt(fastify, { tenantId, userId, conversationId, question }) {
  let vector = [];
  let docHits = [];
  let historyHits = [];

  try {
    vector = await createEmbedding(fastify, question);

    [docHits, historyHits] = await Promise.all([
      searchInQdrant(tenantId, vector, 5),
      searchChatHistory(tenantId, userId, vector, {
        limit: 3,
        excludeConversationId: conversationId
      })
    ]);
  } catch (error) {
    fastify.log.warn({ err: error }, "RAG retrieval failed, continuing without context");
  }

  const recentMessages = await getRecentConversationMessages(fastify, conversationId, 6);

  const parts = [
    "You are an enterprise knowledge base assistant.",
    "Answer the user's question using the context layers below. Prefer specific facts from the context.",
    "If the knowledge base has no relevant content, fall back to general knowledge and say so briefly.",
    ""
  ];

  // Layer 1 — short-term memory: current conversation thread
  if (recentMessages.length) {
    parts.push("=== Conversation so far ===");
    for (const msg of recentMessages) {
      const role = msg.role === "USER" ? "User" : "Assistant";
      parts.push(`${role}: ${msg.content.slice(0, 400)}`);
    }
    parts.push("");
  }

  // Layer 2 — knowledge base: indexed document chunks
  if (docHits.length) {
    parts.push("=== Knowledge base (indexed documents) ===");
    docHits.forEach((hit, i) => {
      parts.push(`[${i + 1}] (${hit.filename})\n${hit.text}`);
    });
  } else {
    parts.push("=== Knowledge base (indexed documents) ===\n(no indexed documents matched this question)");
  }
  parts.push("");

  // Layer 3 — long-term memory: semantically similar past Q&A
  if (historyHits.length) {
    parts.push("=== Related answers from your previous sessions ===");
    historyHits.forEach((hit, i) => {
      parts.push(
        `[${i + 1}] You previously asked: "${hit.question}"\nAnswer given: ${hit.answer}`
      );
    });
    parts.push("");
  }

  parts.push(`=== Current question ===\n${question}`);

  return {
    prompt: parts.join("\n"),
    docHits,
    historyHits,
    vector,
    historyUsed: historyHits.length > 0
  };
}

export async function getOrCreateConversation(fastify, userId, tenantId, conversationId, title) {
  if (conversationId) {
    const existing = await fastify.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId, tenantId }
    });
    if (existing) return existing;
  }

  return fastify.prisma.chatConversation.create({
    data: {
      userId,
      tenantId,
      title: title?.slice(0, 120) || "New conversation"
    }
  });
}

export async function saveConversationMessage(fastify, data) {
  return fastify.prisma.chatMessage.create({ data });
}

/**
 * Main chat function. Returns sources, history metadata, and the query
 * vector so the controller can index the turn without re-embedding.
 */
export async function streamChatAnswer(fastify, { tenantId, userId, conversationId, question }, onToken) {
  const { prompt, docHits, historyHits, vector, historyUsed } = await buildRagPrompt(fastify, {
    tenantId,
    userId,
    conversationId,
    question
  });

  const answer = await fastify.ollama.chatStream(prompt, onToken);

  return {
    answer: answer || `No answer generated for: ${question}`,
    sources: normalizeSources(docHits),
    historyUsed,
    historyCount: historyHits.length,
    vector
  };
}

export async function listConversations(fastify, userId, tenantId) {
  return fastify.prisma.chatConversation.findMany({
    where: { userId, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
}

export async function deleteConversation(fastify, conversationId, userId, tenantId) {
  const conversation = await fastify.prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, tenantId }
  });
  if (!conversation) throw fastify.httpErrors.notFound("Conversation not found");

  await fastify.prisma.chatConversation.delete({ where: { id: conversationId } });

  // Clean up indexed vectors for this conversation (non-blocking)
  deleteChatHistoryByConversation(tenantId, conversationId).catch((err) =>
    fastify.log.warn({ err }, "Failed to clean chat history vectors")
  );

  return { id: conversationId, deleted: true };
}

export async function getConversationMessages(fastify, conversationId, userId, tenantId) {
  const conversation = await fastify.prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!conversation) {
    throw fastify.httpErrors.notFound("Conversation not found");
  }

  return conversation;
}
