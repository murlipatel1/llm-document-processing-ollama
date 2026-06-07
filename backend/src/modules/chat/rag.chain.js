/**
 * RAG generation step.
 *
 * Receives a fully-built prompt (system context + retrieved chunks +
 * conversation history) and streams the LLM response token-by-token
 * through the provided callback.
 *
 * Keeping the LLM call isolated here makes it easy to swap the model
 * provider (Ollama → OpenAI, etc.) without touching the retrieval logic
 * in chat.service.js.
 */
export async function runRagChain(fastify, prompt, onToken) {
  const answer = await fastify.ollama.chatStream(prompt, onToken);
  return answer ?? "";
}
