import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { SUPPORTED_MIME_TYPES_LABEL } from "../../config/constants.js";

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

  // Throw explicitly so callers receive a clear error instead of binary
  // garbage silently flowing into the chunker and embedder.
  throw new Error(
    `Cannot parse file with MIME type "${mimeType}". Supported: ${SUPPORTED_MIME_TYPES_LABEL}`
  );
}
