export async function listAuditHandler(request, reply) {
  const items = await this.prisma.auditLog.findMany({
    where: { tenantId: request.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return reply.send({ items });
}
