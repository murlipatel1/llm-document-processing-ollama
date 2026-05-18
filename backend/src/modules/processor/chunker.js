export function splitTextIntoChunks(text, chunkSize = 1000) {
  if (!text) return [];

  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
