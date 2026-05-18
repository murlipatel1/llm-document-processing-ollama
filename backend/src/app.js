import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import { loggerConfig } from "./config/logger.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { redisPlugin } from "./plugins/redis.js";
import { minioPlugin } from "./plugins/minio.js";
import { queuePlugin } from "./plugins/queue.js";
import { ollamaPlugin } from "./plugins/ollama.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { chatRoutes } from "./modules/chat/chat.routes.js";
import { searchRoutes } from "./modules/search/search.routes.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { registerAuditHook } from "./modules/audit/audit.hook.js";

export function buildApp() {
  const app = Fastify({ logger: loggerConfig });

  app.register(cors, { origin: true });
  app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  app.register(sensible);
  app.register(prismaPlugin);
  app.register(jwtPlugin);
  app.register(redisPlugin);
  app.register(minioPlugin);
  app.register(queuePlugin);
  app.register(ollamaPlugin);

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(usersRoutes, { prefix: "/api/users" });
  app.register(documentsRoutes, { prefix: "/api/documents" });
  app.register(chatRoutes, { prefix: "/api/chat" });
  app.register(searchRoutes, { prefix: "/api/search" });
  app.register(auditRoutes, { prefix: "/api/audit" });
  registerAuditHook(app);

  app.setErrorHandler(errorHandler);

  return app;
}
