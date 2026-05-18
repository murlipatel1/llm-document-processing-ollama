import { loginHandler, refreshHandler, registerHandler } from "./auth.controller.js";
import { loginBodySchema, registerBodySchema } from "./auth.schema.js";

export async function authRoutes(fastify) {
  fastify.post("/register", { schema: { body: registerBodySchema } }, registerHandler.bind(fastify));
  fastify.post("/login", { schema: { body: loginBodySchema } }, loginHandler.bind(fastify));
  fastify.post(
    "/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", minLength: 10 }
          }
        }
      }
    },
    refreshHandler.bind(fastify)
  );
}
