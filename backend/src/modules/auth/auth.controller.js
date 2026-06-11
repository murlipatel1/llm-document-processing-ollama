import { env } from "../../config/env.js";
import { verifyRefreshToken } from "../../lib/jwt-verify.js";
import { loginUser, registerUser, revokeRefreshToken } from "./auth.service.js";

export async function registerHandler(request, reply) {
  const result = await registerUser(this, request.body);
  return reply.status(201).send(result);
}

export async function loginHandler(request, reply) {
  const result = await loginUser(this, request.body);
  return reply.send(result);
}

export async function refreshHandler(request, reply) {
  const { refreshToken } = request.body;
  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  });

  if (!storedToken) return reply.status(401).send({ message: "Invalid refresh token" });
  if (storedToken.expiresAt < new Date()) {
    return reply.status(401).send({ message: "Refresh token expired" });
  }

  const payload = verifyRefreshToken(refreshToken);
  const accessToken = this.jwt.sign(
    { sub: payload.sub, role: payload.role, tenantId: payload.tenantId },
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );

  return reply.send({ accessToken, refreshToken });
}

export async function logoutHandler(request, reply) {
  const { refreshToken } = request.body;
  const userId = request.user?.sub;

  if (!userId) {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  const revoked = await revokeRefreshToken(this, refreshToken, userId);
  if (!revoked) {
    return reply.status(400).send({ message: "Invalid refresh token" });
  }

  return reply.status(204).send();
}
