const roleWeight = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3
};

export function authorize(minRole) {
  return async function roleGuard(request, reply) {
    const currentRole = request.user?.role;

    if (!currentRole || roleWeight[currentRole] < roleWeight[minRole]) {
      return reply.status(403).send({ message: "Forbidden" });
    }
  };
}
