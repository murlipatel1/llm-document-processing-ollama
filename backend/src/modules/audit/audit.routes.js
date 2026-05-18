import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { listAuditHandler } from "./audit.controller.js";

export async function auditRoutes(fastify) {
  fastify.get(
    "/",
    { preHandler: [authenticate, tenantScope, authorize("ADMIN")] },
    listAuditHandler.bind(fastify)
  );
}
