import { env } from "../config/env.js";

function formatOllamaError(error, modelName) {
  const message = error?.message || String(error);

  if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
    return `Cannot connect to Ollama at ${env.OLLAMA_BASE_URL}. Start the Ollama app or run: ollama serve`;
  }

  if (message.includes("not found") || message.includes("404")) {
    return `Model "${modelName}" is not installed. Run: ollama pull ${modelName}`;
  }

  return message;
}

export async function ollamaGenerate(prompt) {
  const model = env.OLLAMA_CHAT_MODEL;
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(formatOllamaError(new Error(text), model));
    }

    const data = await response.json();
    return data.response || "";
  } catch (error) {
    throw new Error(formatOllamaError(error, model));
  }
}

export async function ollamaEmbed(text) {
  const model = env.OLLAMA_EMBED_MODEL;
  if (!text) return [];

  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(formatOllamaError(new Error(text), model));
    }

    const data = await response.json();
    return data.embedding || [];
  } catch (error) {
    throw new Error(formatOllamaError(error, model));
  }
}
