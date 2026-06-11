import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../../config/env.js";
import { signRefreshToken } from "../../lib/jwt-verify.js";
import { clearFailedLogin, recordFailedLogin } from "../../middleware/authRateLimit.js";

// ---------------------------------------------------------------------------
// Password-strength schema
// ---------------------------------------------------------------------------
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^a-zA-Z\d]/, "Password must contain at least one special character");

const registerPayloadSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  tenantName: z.string().min(2, "Tenant name must be at least 2 characters")
});

// ---------------------------------------------------------------------------

function createSlug(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

export async function registerUser(fastify, payload) {
  const parsed = registerPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join("; ");
    throw fastify.httpErrors.badRequest(message);
  }

  const existing = await fastify.prisma.user.findUnique({
    where: { email: payload.email }
  });
  if (existing) throw fastify.httpErrors.conflict("Email already registered");

  const tenantSlug = createSlug(payload.tenantName);
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const result = await fastify.prisma.$transaction(async (tx) => {
    let tenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      tenant = await tx.tenant.create({
        data: { name: payload.tenantName, slug: tenantSlug }
      });
    }

    const user = await tx.user.create({
      data: {
        email: payload.email,
        password: passwordHash,
        role: "ADMIN",
        tenantId: tenant.id
      }
    });

    return { user, tenant };
  });

  const tokens = await issueTokens(fastify, result.user);
  return { user: sanitizeUser(result.user), ...tokens };
}

export async function loginUser(fastify, payload) {
  const user = await fastify.prisma.user.findUnique({
    where: { email: payload.email }
  });
  if (!user) {
    await recordFailedLogin(fastify, payload.email);
    throw fastify.httpErrors.unauthorized("Invalid credentials");
  }

  const validPassword = await bcrypt.compare(payload.password, user.password);
  if (!validPassword) {
    await recordFailedLogin(fastify, payload.email);
    throw fastify.httpErrors.unauthorized("Invalid credentials");
  }

  await clearFailedLogin(fastify, payload.email);
  const tokens = await issueTokens(fastify, user);
  return { user: sanitizeUser(user), ...tokens };
}

function refreshExpiresAt() {
  const match = env.JWT_REFRESH_EXPIRES.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return new Date(Date.now() + amount * (multipliers[unit] ?? 86400000));
}

export async function issueTokens(fastify, user) {
  const tokenPayload = { sub: user.id, role: user.role, tenantId: user.tenantId };

  const accessToken = fastify.jwt.sign(tokenPayload, { expiresIn: env.JWT_ACCESS_EXPIRES });
  const refreshToken = signRefreshToken(tokenPayload);

  await fastify.prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiresAt()
    }
  });

  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(fastify, refreshToken, userId) {
  const token = await fastify.prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  });

  if (!token) return false;
  if (token.userId !== userId) return false;

  await fastify.prisma.refreshToken.delete({
    where: { token: refreshToken }
  });

  return true;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  };
}
