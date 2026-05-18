import { createChatAnswer } from "./chat.service.js";

export async function chatHandler(request, reply) {
  const result = await createChatAnswer(this, request.tenantId, request.body?.question || "");
  return reply.send(result);
}
