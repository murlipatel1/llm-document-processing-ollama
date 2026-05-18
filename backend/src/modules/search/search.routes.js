import { authenticate } from "../../middleware/authenticate.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { searchHandler } from "./search.controller.js";

export async function searchRoutes(fastify) {
  fastify.get("/", { preHandler: [authenticate, tenantScope] }, searchHandler.bind(fastify));
}
