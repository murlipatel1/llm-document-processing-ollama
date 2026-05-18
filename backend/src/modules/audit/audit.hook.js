export function registerAuditHook(fastify) {
  fastify.addHook("onResponse", async (request, reply) => {
    if (!request.user?.sub || !request.user?.tenantId) return;

    try {
      await fastify.prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId: request.user.tenantId,
          action: `${request.method} ${request.routerPath || request.url}`,
          resource: request.url,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] || null
        }
      });
    } catch (error) {
      request.log.warn({ err: error }, "Failed to write audit log");
    }
  });
}
