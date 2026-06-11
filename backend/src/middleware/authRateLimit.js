import { env } from "../config/env.js";

const WINDOW_SEC = env.AUTH_RATE_LIMIT_WINDOW_SEC;

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return request.ip;
}

async function incrementCounter(redis, key, windowSec) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  const ttl = await redis.ttl(key);
  return { count, retryAfter: ttl > 0 ? ttl : windowSec };
}

function tooManyRequests(reply, retryAfter) {
  return reply
    .status(429)
    .header("Retry-After", String(retryAfter))
    .send({ message: "Too many requests. Please try again later." });
}

/**
 * Per-IP rate limit for auth endpoints (login, register, refresh).
 */
export function createAuthRateLimit({ max, keyPrefix = "auth:ip" }) {
  return async function authRateLimit(request, reply) {
    const redis = request.server.redis;
    if (!redis || redis.status !== "ready") return;

    const ip = clientIp(request);
    const key = `${keyPrefix}:${ip}`;
    const { count, retryAfter } = await incrementCounter(redis, key, WINDOW_SEC);

    if (count > max) {
      return tooManyRequests(reply, retryAfter);
    }
  };
}

/**
 * Track failed login attempts per email. Call from loginUser on bad credentials.
 */
export async function recordFailedLogin(fastify, email) {
  const redis = fastify.redis;
  if (!redis || redis.status !== "ready") return;

  const normalized = email.toLowerCase().trim();
  const key = `auth:login:fail:${normalized}`;
  const { count } = await incrementCounter(redis, key, WINDOW_SEC);

  if (count >= env.AUTH_LOGIN_MAX_FAILURES) {
    await redis.expire(key, WINDOW_SEC);
  }
}

/**
 * Block login when an email has exceeded the failure threshold.
 */
export async function loginFailureRateLimit(request, reply) {
  const redis = request.server.redis;
  if (!redis || redis.status !== "ready") return;

  const email = request.body?.email;
  if (!email) return;

  const key = `auth:login:fail:${email.toLowerCase().trim()}`;
  const count = Number(await redis.get(key)) || 0;

  if (count >= env.AUTH_LOGIN_MAX_FAILURES) {
    const retryAfter = (await redis.ttl(key)) || WINDOW_SEC;
    return tooManyRequests(reply, retryAfter);
  }
}

/**
 * Clear failure counter after a successful login.
 */
export async function clearFailedLogin(fastify, email) {
  const redis = fastify.redis;
  if (!redis || redis.status !== "ready") return;
  await redis.del(`auth:login:fail:${email.toLowerCase().trim()}`);
}
