const SKIP_METHODS = new Set(["OPTIONS", "HEAD"]);

const SKIP_PATH_PREFIXES = [
  "/api/auth/refresh",
  "/api/audit"
];

function shouldSkipAudit(request) {
  if (!request.user?.sub || !request.user?.tenantId) return true;
  if (SKIP_METHODS.has(request.method)) return true;

  const path = request.routerPath || request.url.split("?")[0];
  if (SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  // Log mutations and sensitive reads; skip routine GET polling
  if (request.method === "GET") {
    const sensitiveGetPrefixes = ["/api/users", "/api/documents/"];
    const isSensitive = sensitiveGetPrefixes.some((prefix) => path.startsWith(prefix));
    if (!isSensitive) return true;
  }

  return false;
}

export function registerAuditHook(fastify) {
  fastify.addHook("onResponse", async (request, reply) => {
    if (shouldSkipAudit(request)) return;
    if (reply.statusCode >= 500) return;

    const path = request.routerPath || request.url.split("?")[0];

    try {
      await fastify.prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId: request.user.tenantId,
          action: `${request.method} ${path}`,
          resource: path,
          metadata: {
            statusCode: reply.statusCode,
            query: Object.keys(request.query || {}).length ? request.query : undefined
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] || null
        }
      });
    } catch (error) {
      request.log.warn({ err: error }, "Failed to write audit log");
    }
  });
}
