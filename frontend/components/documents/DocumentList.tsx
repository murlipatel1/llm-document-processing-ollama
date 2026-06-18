"use client";

import { useEffect, useRef, useState } from "react";
import ProcessingBadge from "./ProcessingBadge";

type DocumentItem = {
  id: string;
  filename: string;
  mimeType?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorMsg?: string | null;
  chunkCount?: number;
  createdAt?: string;
};

type Props = {
  items: DocumentItem[];
  onReprocess: (documentId: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onDownload: (documentId: string, filename: string) => Promise<void>;
  onGetPreviewUrl: (documentId: string) => Promise<string>;
  canEdit: boolean;
};

function fileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()?.toUpperCase() || "FILE" : "FILE";
}

function formatRelativeTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isPreviewable(mimeType?: string, filename?: string) {
  const mime = (mimeType || "").toLowerCase();
  const ext = filename?.split(".").pop()?.toLowerCase();

  if (mime === "application/pdf" || ext === "pdf") return "pdf";

  if (
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime === "text/x-markdown" ||
    ext === "txt" ||
    ext === "md"
  ) {
    return "text";
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    ext === "docx" ||
    ext === "doc"
  ) {
    return "text";
  }

  return null;
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v13m0 0-4-4m4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type PreviewState =
  | { type: "loading"; filename: string }
  | { type: "text"; filename: string; content: string }
  | { type: "pdf"; filename: string; url: string }
  | { type: "error"; filename: string; message: string };

export default function DocumentList({ items, onReprocess, onDelete, onDownload, onGetPreviewUrl, canEdit }: Props) {
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const previewBlobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deletingId) setPendingDelete(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, deletingId]);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  const closePreview = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setPreview(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    setDeletingId(pendingDelete.id);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      setDeleteError("Could not delete this document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    try {
      await onReprocess(id);
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDownload = async (item: DocumentItem) => {
    setDownloadingId(item.id);
    try {
      await onDownload(item.id, item.filename);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (item: DocumentItem) => {
    const kind = isPreviewable(item.mimeType, item.filename);
    if (!kind) return;

    setPreviewingId(item.id);
    setPreview({ type: "loading", filename: item.filename });
    try {
      const blobUrl = await onGetPreviewUrl(item.id);
      previewBlobRef.current = blobUrl;

      if (kind === "pdf") {
        setPreview({ type: "pdf", filename: item.filename, url: blobUrl });
      } else {
        const response = await fetch(blobUrl);
        const text = await response.text();
        setPreview({ type: "text", filename: item.filename, content: text });
        URL.revokeObjectURL(blobUrl);
        previewBlobRef.current = null;
      }
    } catch {
      setPreview({ type: "error", filename: item.filename, message: "Preview unavailable." });
    } finally {
      setPreviewingId(null);
    }
  };

  if (!items.length) {
    return (
      <div className="doc-empty">
        <div className="doc-empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="doc-empty-title">No documents yet</p>
        <p className="subtext">Upload a file to index it for search and chat.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="doc-list" role="list">
        {items.map((item) => {
          const ext = fileExtension(item.filename);
          const isDeleting = deletingId === item.id;
          const isReprocessing = reprocessingId === item.id;
          const isDownloading = downloadingId === item.id;
          const isPreviewing = previewingId === item.id;
          const canPreview = !!isPreviewable(item.mimeType, item.filename);
          const busy = Boolean(deletingId) || isReprocessing;

          return (
            <li key={item.id} className={`doc-card${isDeleting ? " is-busy" : ""}`}>
              <div className="doc-card-icon" aria-hidden="true">
                <span className="doc-card-ext">{ext}</span>
              </div>

              <div className="doc-card-body">
                <div className="doc-card-top">
                  <h3 className="doc-card-title" title={item.filename}>{item.filename}</h3>
                </div>
                <p className="doc-card-meta">
                  {item.status === "READY" && item.chunkCount != null ? (
                    <span>{item.chunkCount} chunks indexed</span>
                  ) : item.status === "PROCESSING" ? (
                    <span>Extracting text and building embeddings…</span>
                  ) : item.status === "PENDING" ? (
                    <span>Queued for processing</span>
                  ) : null}
                  {item.createdAt ? (
                    <span className="doc-card-time"> · {formatRelativeTime(item.createdAt)}</span>
                  ) : null}
                </p>
                {item.status === "FAILED" && item.errorMsg ? (
                  <p className="doc-card-error">{item.errorMsg}</p>
                ) : null}
              </div>

              <div className="doc-card-actions">
                {(item.status === "PENDING" || item.status === "FAILED") && (
                  <button type="button" className="secondary-btn doc-action-btn" disabled={busy || isReprocessing} onClick={() => handleReprocess(item.id)}>
                    {isReprocessing ? "Starting…" : item.status === "FAILED" ? "Retry" : "Process"}
                  </button>
                )}

                <ProcessingBadge status={item.status} />

                {/* Preview button — PDF inline, text/Word as extracted content */}
                {canPreview && item.status === "READY" && (
                  <button
                    type="button"
                    className="doc-icon-btn"
                    disabled={busy || isPreviewing}
                    onClick={() => handlePreview(item)}
                    aria-label={`Preview ${item.filename}`}
                    title="Preview"
                  >
                    {isPreviewing ? <span className="upload-spinner upload-spinner-sm" aria-hidden="true" /> : <EyeIcon />}
                  </button>
                )}

                {/* Download button */}
                <button
                  type="button"
                  className="doc-icon-btn"
                  disabled={busy || isDownloading}
                  onClick={() => handleDownload(item)}
                  aria-label={`Download ${item.filename}`}
                  title="Download"
                >
                  {isDownloading ? <span className="upload-spinner upload-spinner-sm" aria-hidden="true" /> : <DownloadIcon />}
                </button>

                {canEdit && (
                  <button
                    type="button"
                    className="doc-delete-btn"
                    disabled={busy || isReprocessing}
                    onClick={() => { setDeleteError(null); setPendingDelete(item); }}
                    aria-label={`Delete ${item.filename}`}
                    title="Delete document"
                  >
                    {isDeleting ? <span className="upload-spinner" aria-hidden="true" /> : <TrashIcon />}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Delete confirmation modal */}
      {pendingDelete ? (
        <div className="conversation-modal-backdrop" role="presentation" onClick={() => { if (!deletingId) setPendingDelete(null); }}>
          <div className="conversation-modal" role="dialog" aria-modal="true" aria-labelledby="delete-document-title" onClick={(e) => e.stopPropagation()}>
            <div className="conversation-modal-icon" aria-hidden="true"><TrashIcon /></div>
            <h4 id="delete-document-title">Delete document?</h4>
            <p className="conversation-modal-text">
              <strong>{pendingDelete.filename}</strong> will be removed from storage and all search vectors will be deleted. This cannot be undone.
            </p>
            {deleteError ? <p className="error-text conversation-modal-error">{deleteError}</p> : null}
            <div className="conversation-modal-actions">
              <button type="button" className="secondary-btn" disabled={Boolean(deletingId)} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="danger-btn" disabled={Boolean(deletingId)} onClick={confirmDelete}>
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Preview modal */}
      {preview && (
        <div className="preview-modal-backdrop" role="presentation" onClick={closePreview}>
          <div className="preview-modal" role="dialog" aria-modal="true" aria-label={`Preview: ${preview.filename}`} onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <span className="preview-modal-title" title={preview.filename}>{preview.filename}</span>
              <button type="button" className="preview-close-btn" onClick={closePreview} aria-label="Close preview">
                <XIcon />
              </button>
            </div>
            <div className="preview-modal-body">
              {preview.type === "loading" && (
                <div className="preview-loading">
                  <span className="upload-spinner" aria-hidden="true" />
                  <span>Loading preview…</span>
                </div>
              )}
              {preview.type === "error" && (
                <p className="preview-error">{preview.message}</p>
              )}
              {preview.type === "text" && (
                <pre className="preview-text-content">{preview.content}</pre>
              )}
              {preview.type === "pdf" && (
                <iframe
                  src={preview.url}
                  title={preview.filename}
                  className="preview-pdf-frame"
                  aria-label="PDF preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
