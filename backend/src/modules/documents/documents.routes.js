import { authenticate } from "../../middleware/authenticate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { createDocumentHandler, listDocumentsHandler } from "./documents.controller.js";

export async function documentsRoutes(fastify) {
  fastify.get("/", { preHandler: [authenticate, tenantScope] }, listDocumentsHandler.bind(fastify));
  fastify.post(
    "/",
    { preHandler: [authenticate, tenantScope] },
    createDocumentHandler.bind(fastify)
  );
}
