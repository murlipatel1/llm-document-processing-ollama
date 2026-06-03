export async function listAuditHandler(request, reply) {
  const { search, method, limit: limitParam } = request.query || {};
  const take = Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 200);

  const where = { tenantId: request.tenantId };

  if (method && typeof method === "string") {
    where.action = { startsWith: method.toUpperCase() };
  }

  if (search && typeof search === "string" && search.trim()) {
    const term = search.trim();
    where.OR = [
      { action: { contains: term, mode: "insensitive" } },
      { resource: { contains: term, mode: "insensitive" } },
      { ipAddress: { contains: term, mode: "insensitive" } },
      { user: { email: { contains: term, mode: "insensitive" } } }
    ];
  }

  const items = await this.prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { email: true, role: true } }
    },
    orderBy: { createdAt: "desc" },
    take
  });

  return reply.send({
    items: items.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: log.user
        ? { email: log.user.email, role: log.user.role }
        : { email: "Unknown", role: null }
    }))
  });
}
