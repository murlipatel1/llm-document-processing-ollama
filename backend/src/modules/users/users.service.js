export async function listTenantUsers(fastify, tenantId) {
  return fastify.prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, role: true, createdAt: true }
  });
}
