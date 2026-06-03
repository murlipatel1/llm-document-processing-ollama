import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { listAuditHandler } from "./audit.controller.js";

export async function auditRoutes(fastify) {
  fastify.get(
    "/",
    {
      preHandler: [authenticate, tenantScope, authorize("ADMIN")],
      schema: {
        querystring: {
          type: "object",
          properties: {
            search: { type: "string" },
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            limit: { type: "integer", minimum: 1, maximum: 200 }
          }
        }
      }
    },
    listAuditHandler.bind(fastify)
  );
}
