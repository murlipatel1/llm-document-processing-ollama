import { ollamaGenerate } from "../../lib/ollama-client.js";

/**
 * Maximum characters of extracted text fed to the LLM for summarization.
 * Large enough for meaningful context; small enough to stay well within
 * typical Ollama context windows (4 k–8 k tokens).
 */
const SUMMARY_MAX_CHARS = 4000;

/**
 * Generate a concise summary of extracted document text using the configured
 * Ollama chat model.  Summarization failure is intentionally non-fatal — the
 * caller should continue processing and store `null` when this throws.
 *
 * @param {string} text  Full extracted document text.
 * @returns {Promise<string|null>}  2-4 sentence summary, or null on failure.
 */
export async function generateSummary(text) {
  if (!text || text.trim().length < 50) return null;

  const excerpt = text.slice(0, SUMMARY_MAX_CHARS);

  const prompt =
    `You are a document summarizer for an enterprise knowledge base. ` +
    `Read the following document content and write a concise summary in 2-4 sentences. ` +
    `Focus on the main topic, purpose, and key points. ` +
    `Write in plain prose — no bullet points, headers, or preamble.\n\n` +
    `Document content:\n${excerpt}\n\nSummary:`;

  const raw = await ollamaGenerate(prompt);

  const summary = raw?.trim() || null;
  return summary && summary.length > 0 ? summary : null;
}
