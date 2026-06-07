const roleWeight = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3
};

/**
 * Role and tenantId are confirmed to be present in the JWT payload at token
 * issuance (see auth.service.js → issueTokens). After jwtVerify() runs in
 * authenticate.js, both values are available on request.user.
 *
 * Guards are fail-closed: any unrecognised role value is treated as
 * insufficient rather than silently passing (undefined < number is false
 * in JS, which would grant access — this check prevents that).
 */
export function authorize(minRole) {
  return async function roleGuard(request, reply) {
    const currentRole = request.user?.role;
    const weight = roleWeight[currentRole];

    if (!currentRole || weight === undefined || weight < roleWeight[minRole]) {
      return reply.status(403).send({ message: "Forbidden" });
    }
  };
}
