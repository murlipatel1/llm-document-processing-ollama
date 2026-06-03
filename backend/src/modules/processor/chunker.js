import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""]
});

export async function splitTextIntoChunks(text, chunkSize = 1000) {
  if (!text) return [];

  if (chunkSize !== 1000) {
    const custom = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: Math.min(200, Math.floor(chunkSize * 0.2)),
      separators: ["\n\n", "\n", ". ", " ", ""]
    });
    return custom.splitText(text);
  }

  return splitter.splitText(text);
}
