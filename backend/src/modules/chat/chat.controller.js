import {
  deleteConversation,
  getConversationMessages,
  getOrCreateConversation,
  listConversations,
  saveConversationMessage,
  streamChatAnswer
} from "./chat.service.js";
import { indexChatTurn } from "./chat-history.qdrant.js";

export async function chatHandler(request, reply) {
  const question = request.body?.question?.trim();
  if (!question) {
    return reply.status(400).send({ message: "question is required" });
  }

  const userId = request.user?.sub;
  if (!userId) {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  const conversation = await getOrCreateConversation(
    this,
    userId,
    request.tenantId,
    request.body?.conversationId,
    question
  );

  await saveConversationMessage(this, {
    conversationId: conversation.id,
    userId,
    tenantId: request.tenantId,
    role: "USER",
    content: question
  });

  const origin = request.headers.origin || "*";
  reply.raw.setHeader("Access-Control-Allow-Origin", origin);
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.flushHeaders?.();

  let fullAnswer = "";
  const sendEvent = (payload) => {
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const result = await streamChatAnswer(
      this,
      {
        tenantId: request.tenantId,
        userId,
        conversationId: conversation.id,
        question
      },
      (token) => {
        fullAnswer += token;
        sendEvent({ token, done: false, conversationId: conversation.id });
      }
    );

    const finalAnswer = fullAnswer || result.answer;

    await saveConversationMessage(this, {
      conversationId: conversation.id,
      userId,
      tenantId: request.tenantId,
      role: "ASSISTANT",
      content: finalAnswer,
      sources: result.sources
    });

    sendEvent({
      done: true,
      conversationId: conversation.id,
      sources: result.sources,
      historyUsed: result.historyUsed,
      historyCount: result.historyCount
    });

    // Index this Q&A turn for future semantic retrieval — fire and forget
    if (result.vector?.length) {
      indexChatTurn({
        tenantId: request.tenantId,
        userId,
        conversationId: conversation.id,
        question,
        answer: finalAnswer,
        vector: result.vector
      }).catch((err) => this.log.warn({ err }, "Failed to index chat turn"));
    }
  } catch (error) {
    this.log.warn({ err: error }, "Chat streaming failed");
    sendEvent({
      done: true,
      error: error?.message || "Chat streaming failed",
      conversationId: conversation.id
    });
  } finally {
    reply.raw.end();
  }
}

export async function listConversationsHandler(request, reply) {
  const userId = request.user?.sub;
  const items = await listConversations(this, userId, request.tenantId);

  return reply.send({
    items: items.map((conv) => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.messages[0]?.content || ""
    }))
  });
}

export async function deleteConversationHandler(request, reply) {
  const userId = request.user?.sub;
  const result = await deleteConversation(this, request.params.id, userId, request.tenantId);
  return reply.send(result);
}

export async function getConversationHandler(request, reply) {
  const userId = request.user?.sub;
  const conversation = await getConversationMessages(
    this,
    request.params.id,
    userId,
    request.tenantId
  );

  return reply.send({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map((msg) => ({
      id: msg.id,
      role: msg.role === "USER" ? "user" : "assistant",
      text: msg.content,
      sources: Array.isArray(msg.sources) ? msg.sources : []
    }))
  });
}
