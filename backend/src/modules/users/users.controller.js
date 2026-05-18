import { listTenantUsers } from "./users.service.js";

export async function listUsersHandler(request, reply) {
  const users = await listTenantUsers(this, request.tenantId);
  return reply.send({ items: users });
}
