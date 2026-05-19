import { authenticate } from "../../middleware/authenticate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import {
  chatHandler,
  getConversationHandler,
  listConversationsHandler
} from "./chat.controller.js";

export async function chatRoutes(fastify) {
  fastify.post(
    "/",
    {
      preHandler: [authenticate, tenantScope],
      schema: {
        body: {
          type: "object",
          required: ["question"],
          properties: {
            question: { type: "string", minLength: 1 },
            conversationId: { type: "string" }
          }
        }
      }
    },
    chatHandler.bind(fastify)
  );

  fastify.get(
    "/conversations",
    { preHandler: [authenticate, tenantScope] },
    listConversationsHandler.bind(fastify)
  );

  fastify.get(
    "/conversations/:id",
    { preHandler: [authenticate, tenantScope] },
    getConversationHandler.bind(fastify)
  );
}
