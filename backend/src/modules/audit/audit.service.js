export async function createAuditLog(fastify, data) {
  return fastify.prisma.auditLog.create({ data });
}
