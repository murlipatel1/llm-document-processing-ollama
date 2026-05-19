import bcrypt from "bcryptjs";

function createSlug(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

export async function registerUser(fastify, payload) {
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
  if (!user) throw fastify.httpErrors.unauthorized("Invalid credentials");

  const validPassword = await bcrypt.compare(payload.password, user.password);
  if (!validPassword) throw fastify.httpErrors.unauthorized("Invalid credentials");

  const tokens = await issueTokens(fastify, user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function issueTokens(fastify, user) {
  const tokenPayload = { sub: user.id, role: user.role, tenantId: user.tenantId };

  const accessToken = fastify.jwt.sign(tokenPayload, { expiresIn: "15m" });
  const refreshToken = fastify.jwt.sign(tokenPayload, { expiresIn: "7d" });

  await fastify.prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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
