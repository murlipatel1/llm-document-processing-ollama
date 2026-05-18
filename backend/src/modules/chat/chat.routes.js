import { authenticate } from "../../middleware/authenticate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { chatHandler } from "./chat.controller.js";

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
            question: { type: "string", minLength: 1 }
          }
        }
      }
    },
    chatHandler.bind(fastify)
  );
}
