import { Redis } from "ioredis";
import { env } from "./env.js";

export function createRedisClient(logger) {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 20) return null;
      return Math.min(times * 200, 3000);
    }
  });

  redis.on("error", (err) => {
    if (logger?.warn) {
      logger.warn({ err }, "Redis connection error");
      return;
    }
    console.warn("Redis connection error:", err.message);
  });

  return redis;
}
