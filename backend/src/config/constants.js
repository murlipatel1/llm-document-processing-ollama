export const ROLES = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER"
};

export const QUEUES = {
  DOCUMENT_PROCESSING: "document-processing"
};

/**
 * File types the pipeline can actually parse and embed.
 * Any upload whose MIME type is not in this set is rejected at the API layer
 * (HTTP 415) before it is stored or queued.
 *
 * The worker also re-validates against this set as a second safety net so
 * files already in the queue from older code versions still fail cleanly
 * with a descriptive error instead of an opaque mid-pipeline crash.
 */
export const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown"
]);

/** Human-readable list used in error messages. */
export const SUPPORTED_MIME_TYPES_LABEL = "PDF, DOCX, DOC, TXT, MD";
