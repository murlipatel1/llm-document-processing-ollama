import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import { listUsersHandler } from "./users.controller.js";
import { listUsersResponseSchema } from "./users.schema.js";

export async function usersRoutes(fastify) {
  fastify.get(
    "/",
    {
      preHandler: [authenticate, tenantScope, authorize("ADMIN")],
      schema: { response: { 200: listUsersResponseSchema } }
    },
    listUsersHandler.bind(fastify)
  );
}
