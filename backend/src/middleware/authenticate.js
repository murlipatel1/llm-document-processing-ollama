import { verifyAccessToken } from "../lib/jwt-verify.js";

export async function authenticate(request, reply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  const token = header.slice(7);
  try {
    request.user = verifyAccessToken(token);
  } catch {
    return reply.status(401).send({ message: "Unauthorized" });
  }
}
