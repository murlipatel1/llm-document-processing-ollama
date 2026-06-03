import { deleteUser, listTenantUsers, updateUserRole } from "./users.service.js";

export async function listUsersHandler(request, reply) {
  const users = await listTenantUsers(this, request.tenantId);
  return reply.send({ items: users });
}

export async function updateUserRoleHandler(request, reply) {
  const updated = await updateUserRole(
    this,
    request.params.id,
    request.tenantId,
    request.body.role,
    request.user?.sub
  );
  return reply.send(updated);
}

export async function deleteUserHandler(request, reply) {
  const result = await deleteUser(this, request.params.id, request.tenantId, request.user?.sub);
  return reply.send(result);
}
