import { createEmbedding } from "../processor/embedder.js";
import { searchInQdrant } from "./qdrant.client.js";

export async function searchHandler(request, reply) {
  const query = request.query?.query?.trim();

  if (!query) {
    return reply.status(400).send({ message: "Query parameter is required" });
  }

  const vector = await createEmbedding(this, query);
  const items = await searchInQdrant(request.tenantId, vector, 8);

  return reply.send({ items });
}
