import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { env } from "../../config/env.js";
import { SUPPORTED_MIME_TYPES, SUPPORTED_MIME_TYPES_LABEL } from "../../config/constants.js";

function guardExtractedText(text, pages) {
  if (text.length > env.MAX_EXTRACTED_TEXT_CHARS) {
    throw new Error(
      `Extracted text exceeds the ${env.MAX_EXTRACTED_TEXT_CHARS.toLocaleString()}-character limit ` +
        `(${text.length.toLocaleString()} chars from ${pages || "unknown"} pages). ` +
        "Split the document or raise MAX_EXTRACTED_TEXT_CHARS."
    );
  }
  return { text, pages };
}

export async function parseDocumentFromBuffer(buffer, mimeType) {
  const type = (mimeType || "").toLowerCase();

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `Cannot parse file with MIME type "${mimeType}". Supported: ${SUPPORTED_MIME_TYPES_LABEL}`
    );
  }

  if (type.includes("pdf") || type.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return guardExtractedText(parsed.text || "", parsed.numpages || 0);
  }

  if (
    type.includes("wordprocessingml") ||
    type.includes("msword") ||
    type.endsWith(".docx") ||
    type.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return guardExtractedText(result.value || "", 0);
  }

  if (type.includes("text") || type.endsWith(".txt") || type.endsWith(".md")) {
    return guardExtractedText(buffer.toString("utf8"), 0);
  }

  throw new Error(
    `Cannot parse file with MIME type "${mimeType}". Supported: ${SUPPORTED_MIME_TYPES_LABEL}`
  );
}
