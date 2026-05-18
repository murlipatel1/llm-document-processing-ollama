import { createEmbedding } from "../processor/embedder.js";
import { searchInQdrant } from "../search/qdrant.client.js";

export async function createChatAnswer(fastify, tenantId, question) {
  let context = "";
  let sources = [];

  try {
    const vector = await createEmbedding(fastify, question);
    const hits = await searchInQdrant(tenantId, vector, 5);

    if (hits.length) {
      context = hits
        .map((hit, index) => `[${index + 1}] (${hit.filename})\n${hit.text}`)
        .join("\n\n");
      sources = hits.map((hit) => hit.filename).filter((name, i, arr) => arr.indexOf(name) === i);
    }
  } catch (error) {
    fastify.log.warn({ err: error }, "RAG retrieval failed, continuing without context");
  }

  const prompt = [
    "You are an enterprise knowledge base assistant.",
    "Answer using the context below when relevant. If context is empty, answer from general knowledge briefly.",
    "",
    "Context:",
    context || "(no indexed documents matched)",
    "",
    `Question: ${question}`
  ].join("\n");

  let answer = "";
  try {
    answer = await fastify.ollama.chat(prompt);
  } catch (error) {
    fastify.log.warn({ err: error }, "Ollama chat failed");
    answer = error?.message || "Ollama request failed. Check that Ollama is running and the model is installed.";
  }

  return {
    answer: answer || `No answer generated for: ${question}`,
    sources
  };
}
