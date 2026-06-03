const VALID_ROLES = ["ADMIN", "EDITOR", "VIEWER"];

export async function listTenantUsers(fastify, tenantId) {
  return fastify.prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, role: true, createdAt: true }
  });
}

export async function updateUserRole(fastify, userId, tenantId, newRole, requesterId) {
  if (!VALID_ROLES.includes(newRole)) {
    throw fastify.httpErrors.badRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  if (userId === requesterId) {
    throw fastify.httpErrors.badRequest("You cannot change your own role");
  }

  const user = await fastify.prisma.user.findFirst({
    where: { id: userId, tenantId }
  });
  if (!user) throw fastify.httpErrors.notFound("User not found in this tenant");

  const updated = await fastify.prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, email: true, role: true, createdAt: true }
  });

  return updated;
}

export async function deleteUser(fastify, userId, tenantId, requesterId) {
  if (userId === requesterId) {
    throw fastify.httpErrors.badRequest("You cannot delete yourself");
  }

  const user = await fastify.prisma.user.findFirst({
    where: { id: userId, tenantId }
  });
  if (!user) throw fastify.httpErrors.notFound("User not found in this tenant");

  await fastify.prisma.user.delete({ where: { id: userId } });
  return { id: userId, deleted: true };
}
