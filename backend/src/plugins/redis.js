import fp from "fastify-plugin";
import { createRedisClient } from "../config/redis.js";

export const redisPlugin = fp(
  async (fastify) => {
    const redis = createRedisClient(fastify.log);

    try {
      await redis.connect();
      fastify.log.info("Redis connected");
    } catch (err) {
      fastify.log.warn({ err }, "Redis not available yet (start Docker: npm run docker:up)");
    }

    fastify.decorate("redis", redis);

    fastify.addHook("onClose", async () => {
      if (redis.status === "ready" || redis.status === "connect") {
        await redis.quit();
      }
    });
  },
  { name: "redis" }
);
