export async function tenantScope(request, reply) {
  if (!request.user?.tenantId) {
    return reply.status(400).send({ message: "Missing tenant scope" });
  }

  request.tenantId = request.user.tenantId;
}
