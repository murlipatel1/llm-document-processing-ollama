import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function parseDocumentFromBuffer(buffer, mimeType) {
  const type = (mimeType || "").toLowerCase();

  if (type.includes("pdf") || type.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return { text: parsed.text || "", pages: parsed.numpages || 0 };
  }

  if (
    type.includes("wordprocessingml") ||
    type.includes("msword") ||
    type.endsWith(".docx") ||
    type.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value || "", pages: 0 };
  }

  if (type.includes("text") || type.endsWith(".txt") || type.endsWith(".md")) {
    return { text: buffer.toString("utf8"), pages: 0 };
  }

  return { text: buffer.toString("utf8"), pages: 0 };
}
