import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { pruneAllTenantsChatHistory } from "./jobs/pruneChatHistory.js";

const CHAT_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Backend running on http://${env.HOST}:${env.PORT}`);

    pruneAllTenantsChatHistory({ log: app.log }).catch((err) => {
      app.log.warn({ err }, "Initial chat history prune sweep failed");
    });

    setInterval(() => {
      pruneAllTenantsChatHistory({ log: app.log }).catch((err) => {
        app.log.warn({ err }, "Scheduled chat history prune sweep failed");
      });
    }, CHAT_PRUNE_INTERVAL_MS).unref();
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
