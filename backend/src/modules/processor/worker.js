import { Worker } from "bullmq";
import { createRedisClient } from "../../config/redis.js";
import { QUEUES } from "../../config/constants.js";
import {
  disconnectPrisma,
  markDocumentFailed,
  processDocumentJob
} from "./process-document.js";

const connection = createRedisClient(console);
await connection.connect();

const worker = new Worker(
  QUEUES.DOCUMENT_PROCESSING,
  async (job) => {
    const { documentId, tenantId } = job.data;
    console.log(`Processing document ${documentId} for tenant ${tenantId}`);
    return processDocumentJob({ documentId, tenantId });
  },
  { connection, concurrency: 1 }
);

worker.on("failed", async (job, err) => {
  console.error(`Job failed: ${job?.id}`, err.message);
  if (job?.data?.documentId) {
    await markDocumentFailed(job.data.documentId, err.message);
  }
});

worker.on("completed", (job, result) => {
  console.log(`Job completed: ${job.id}`, result);
});

process.on("SIGINT", async () => {
  await worker.close();
  await connection.quit();
  await disconnectPrisma();
  process.exit(0);
});

console.log("Document processing worker started");
