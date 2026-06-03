import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { deleteUserHandler, listUsersHandler, updateUserRoleHandler } from "./users.controller.js";

export async function usersRoutes(fastify) {
  fastify.get(
    "/",
    { preHandler: [authenticate, tenantScope, authorize("ADMIN")] },
    listUsersHandler.bind(fastify)
  );

  fastify.patch(
    "/:id/role",
    {
      preHandler: [authenticate, tenantScope, authorize("ADMIN")],
      schema: {
        body: {
          type: "object",
          required: ["role"],
          properties: {
            role: { type: "string", enum: ["ADMIN", "EDITOR", "VIEWER"] }
          }
        }
      }
    },
    updateUserRoleHandler.bind(fastify)
  );

  fastify.delete(
    "/:id",
    { preHandler: [authenticate, tenantScope, authorize("ADMIN")] },
    deleteUserHandler.bind(fastify)
  );
}
