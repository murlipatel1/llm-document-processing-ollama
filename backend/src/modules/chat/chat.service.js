import { createEmbedding } from "../processor/embedder.js";
import { searchInQdrant } from "../search/qdrant.client.js";

function normalizeSources(hits) {
  return hits.map((hit) => ({
    documentId: hit.documentId,
    filename: hit.filename,
    score: hit.score
  }));
}

async function buildRagPrompt(fastify, tenantId, question) {
  let context = "";
  let hits = [];

  try {
    const vector = await createEmbedding(fastify, question);
    hits = await searchInQdrant(tenantId, vector, 5);

    if (hits.length) {
      context = hits
        .map((hit, index) => `[${index + 1}] (${hit.filename})\n${hit.text}`)
        .join("\n\n");
    }
  } catch (error) {
    fastify.log.warn({ err: error }, "RAG retrieval failed, continuing without context");
  }

  const prompt = [
    "You are an enterprise knowledge base assistant.",
    "Answer using the context below when relevant. If context is empty, answer from general knowledge briefly.",
    "",
    "Context:",
    context || "(no indexed documents matched)",
    "",
    `Question: ${question}`
  ].join("\n");

  return { prompt, hits };
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

export async function streamChatAnswer(fastify, tenantId, question, onToken) {
  const { prompt, hits } = await buildRagPrompt(fastify, tenantId, question);
  const sources = normalizeSources(hits);

  const answer = await fastify.ollama.chatStream(prompt, onToken);
  return { answer: answer || `No answer generated for: ${question}`, sources };
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
