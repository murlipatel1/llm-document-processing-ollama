"use client";

import { useEffect, useState } from "react";
import ProcessingBadge from "./ProcessingBadge";

type DocumentItem = {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorMsg?: string | null;
  chunkCount?: number;
  createdAt?: string;
};

type Props = {
  items: DocumentItem[];
  onReprocess: (documentId: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
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

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DocumentList({ items, onReprocess, onDelete, canEdit }: Props) {
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingId) setPendingDelete(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, deletingId]);

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

  if (!items.length) {
    return (
      <div className="doc-empty">
        <div className="doc-empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
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

          return (
            <li key={item.id} className={`doc-card${isDeleting ? " is-busy" : ""}`}>
              <div className="doc-card-icon" aria-hidden="true">
                <span className="doc-card-ext">{ext}</span>
              </div>

              <div className="doc-card-body">
                <div className="doc-card-top">
                  <h3 className="doc-card-title" title={item.filename}>
                    {item.filename}
                  </h3>
                  <ProcessingBadge status={item.status} />
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
                  <button
                    type="button"
                    className="secondary-btn doc-action-btn"
                    disabled={Boolean(deletingId) || isReprocessing}
                    onClick={() => handleReprocess(item.id)}
                  >
                    {isReprocessing ? "Starting…" : item.status === "FAILED" ? "Retry" : "Process"}
                  </button>
                )}
                {item.status === "PROCESSING" && (
                  <span className="doc-processing-label">
                    <span className="upload-spinner doc-processing-spinner" aria-hidden="true" />
                    Processing
                  </span>
                )}
                {item.status === "READY" && (
                  <span className="doc-ready-label">Indexed</span>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="doc-delete-btn"
                    disabled={Boolean(deletingId) || isReprocessing}
                    onClick={() => {
                      setDeleteError(null);
                      setPendingDelete(item);
                    }}
                    aria-label={`Delete ${item.filename}`}
                    title="Delete document"
                  >
                    {isDeleting ? (
                      <span className="upload-spinner" aria-hidden="true" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {pendingDelete ? (
        <div
          className="conversation-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!deletingId) setPendingDelete(null);
          }}
        >
          <div
            className="conversation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-document-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="conversation-modal-icon" aria-hidden="true">
              <TrashIcon />
            </div>
            <h4 id="delete-document-title">Delete document?</h4>
            <p className="conversation-modal-text">
              <strong>{pendingDelete.filename}</strong> will be removed from storage and all
              search vectors will be deleted. This cannot be undone.
            </p>
            {deleteError ? <p className="error-text conversation-modal-error">{deleteError}</p> : null}
            <div className="conversation-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={Boolean(deletingId)}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={Boolean(deletingId)}
                onClick={confirmDelete}
              >
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
