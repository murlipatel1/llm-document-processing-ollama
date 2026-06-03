"use client";

import { useState } from "react";
import UploadDropzone from "@/components/documents/UploadDropzone";
import DocumentList from "@/components/documents/DocumentList";
import DocumentStats from "@/components/documents/DocumentStats";
import { useDocuments } from "@/hooks/useDocuments";
import { getSession } from "@/lib/auth";

const UPLOAD_ROLES = ["ADMIN", "EDITOR"];

export default function DocumentsPage() {
  const { items, loading, fetchDocuments, uploadDocument, deleteDocument, reprocessDocument } =
    useDocuments();
  const [refreshing, setRefreshing] = useState(false);
  const session = getSession();
  const canEdit = UPLOAD_ROLES.includes(session?.role || "");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDocuments();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="card documents-page">
      <header className="documents-header">
        <div>
          <h2 className="page-header">Documents</h2>
          <p className="subtext">
            Upload enterprise files, track indexing status, and manage your knowledge base.
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn documents-refresh-btn"
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          {refreshing || loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <DocumentStats items={items} />

      {canEdit ? (
        <UploadDropzone onUpload={uploadDocument} />
      ) : (
        <div className="documents-viewer-notice" role="note">
          <span className="documents-viewer-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </span>
          <div>
            <strong>View-only access</strong>
            <p className="subtext" style={{ margin: "0.2rem 0 0" }}>
              Only Editors and Admins can upload or delete documents.
            </p>
          </div>
        </div>
      )}

      <section className="documents-list-section" aria-labelledby="documents-list-heading">
        <h3 id="documents-list-heading" className="documents-list-heading">
          Your files
          {!loading && items.length > 0 ? (
            <span className="documents-list-count">{items.length}</span>
          ) : null}
        </h3>

        {loading && !items.length ? (
          <div className="documents-loading">
            <span className="upload-spinner" aria-hidden="true" />
            <p className="subtext">Loading documents…</p>
          </div>
        ) : (
          <DocumentList
            items={items}
            onReprocess={reprocessDocument}
            onDelete={deleteDocument}
            canEdit={canEdit}
          />
        )}
      </section>
    </section>
  );
}
