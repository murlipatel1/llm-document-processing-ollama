import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { createRedisClient } from "../config/redis.js";
import { QUEUES } from "../config/constants.js";

/**
 * Re-indexes every document belonging to a tenant.
 *
 * For each non-PROCESSING document:
 *   1. Resets its status to PENDING (clears any previous error).
 *   2. Enqueues a BullMQ job so the worker re-parses, re-embeds, and
 *      re-upserts the chunks into Qdrant.
 *
 * Can be called programmatically (imported as a module) or run as a
 * standalone script:
 *   node src/jobs/reindexTenant.js <tenantId>
 *
 * @param {string} tenantId
 * @returns {{ queued: number }}
 */
export async function reindexTenant(tenantId) {
  if (!tenantId) throw new Error("tenantId is required");

  const prisma = new PrismaClient();
  const redis = createRedisClient(console);
  await redis.connect();
  const queue = new Queue(QUEUES.DOCUMENT_PROCESSING, { connection: redis });

  try {
    const docs = await prisma.document.findMany({
      where: { tenantId, status: { not: "PROCESSING" } },
      select: { id: true }
    });

    if (!docs.length) {
      console.log(`[reindexTenant] No documents found for tenant ${tenantId}`);
      return { queued: 0 };
    }

    const ids = docs.map((d) => d.id);

    await prisma.document.updateMany({
      where: { id: { in: ids } },
      data: { status: "PENDING", errorMsg: null, chunkCount: 0 }
    });

    await queue.addBulk(
      ids.map((documentId) => ({
        name: "reindex",
        data: { documentId, tenantId }
      }))
    );

    console.log(`[reindexTenant] Queued ${ids.length} document(s) for tenant ${tenantId}`);
    return { queued: ids.length };
  } finally {
    await queue.close();
    await redis.quit();
    await prisma.$disconnect();
  }
}

// ── CLI entry-point ────────────────────────────────────────────────────────────
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("reindexTenant.js") ||
    process.argv[1].endsWith("reindexTenant"));

if (isMain) {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error("Usage: node src/jobs/reindexTenant.js <tenantId>");
    process.exit(1);
  }

  reindexTenant(tenantId)
    .then(({ queued }) => {
      console.log(`Done. Documents queued: ${queued}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Reindex failed:", err.message);
      process.exit(1);
    });
}
