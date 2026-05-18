export async function createEmbedding(fastify, text) {
  if (!text) return [];
  try {
    return await fastify.ollama.embed(text);
  } catch (error) {
    fastify.log.warn({ err: error }, "Ollama embedding failed");
    return [];
  }
}
