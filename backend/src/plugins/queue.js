import fp from "fastify-plugin";
import { createDocumentQueue } from "../modules/processor/queue.js";

export const queuePlugin = fp(
  async (fastify) => {
    const documentQueue = createDocumentQueue(fastify.redis);
    fastify.decorate("documentQueue", documentQueue);

    fastify.addHook("onClose", async () => {
      await documentQueue.close();
    });
  },
  { name: "documentQueue", dependencies: ["redis"] }
);
