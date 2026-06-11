import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { pruneStaleHistoryForTenant } from "../modules/chat/chat-history.qdrant.js";

/**
 * Delete chat-history vectors older than CHAT_HISTORY_MAX_AGE_DAYS for every tenant.
 * Runs on a daily interval from the API server, or standalone:
 *   node src/jobs/pruneChatHistory.js
 */
export async function pruneAllTenantsChatHistory({ log = console } = {}) {
  const prisma = new PrismaClient();

  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    let pruned = 0;

    for (const tenant of tenants) {
      try {
        await pruneStaleHistoryForTenant(tenant.id);
        pruned += 1;
      } catch (err) {
        log.warn?.({ err, tenantId: tenant.id }, "Chat history prune failed for tenant") ??
          console.warn(`Chat history prune failed for tenant ${tenant.id}:`, err.message);
      }
    }

    log.info?.({ tenants: tenants.length, pruned }, "Chat history prune sweep complete") ??
      console.log(`Chat history prune sweep complete (${pruned}/${tenants.length} tenants)`);

    return { tenants: tenants.length, pruned };
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("pruneChatHistory.js") ||
    process.argv[1].endsWith("pruneChatHistory"));

if (isMain) {
  pruneAllTenantsChatHistory()
    .then(({ tenants, pruned }) => {
      console.log(`Done. Pruned ${pruned}/${tenants} tenant collection(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Chat history prune failed:", err.message);
      process.exit(1);
    });
}
