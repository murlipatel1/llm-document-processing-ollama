"use client";

import { useState } from "react";
import { getSession } from "@/lib/auth";

type Source = string | { documentId?: string; filename?: string; score?: number };

type Props = {
  sources: Source[];
};

function sourceKey(source: Source): string {
  if (typeof source === "object" && source.documentId) return source.documentId;
  return typeof source === "string" ? source : source.filename || "Unknown file";
}

function sourceScore(source: Source): number {
  return typeof source === "object" && source.score != null ? source.score : -1;
}

function dedupeSources(sources: Source[]): Source[] {
  const bestByKey = new Map<string, Source>();

  for (const source of sources) {
    const key = sourceKey(source);
    const existing = bestByKey.get(key);
    if (!existing || sourceScore(source) > sourceScore(existing)) {
      bestByKey.set(key, source);
    }
  }

  return [...bestByKey.values()].sort((a, b) => sourceScore(b) - sourceScore(a));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function downloadSource(documentId: string, filename: string) {
  const session = getSession();
  const response = await fetch(`${API_BASE}/api/documents/${documentId}/download`, {
    headers: { Authorization: `Bearer ${session?.accessToken}` }
  });
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v13m0 0-4-4m4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SourceCitations({ sources }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!sources.length) return null;

  const uniqueSources = dedupeSources(sources);

  const handleDownload = async (documentId: string, filename: string) => {
    setDownloadError(null);
    setDownloadingId(documentId);
    try {
      await downloadSource(documentId, filename);
    } catch {
      setDownloadError("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <details className="sources-details">
      <summary className="sources-summary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        {uniqueSources.length} source{uniqueSources.length !== 1 ? "s" : ""}
      </summary>

      <ul className="sources-list">
        {uniqueSources.map((source) => {
          const documentId = typeof source === "object" ? source.documentId : undefined;
          const label = typeof source === "string" ? source : source.filename || "Unknown file";
          const score = typeof source === "object" ? source.score : undefined;
          const key = sourceKey(source);
          const isDownloading = downloadingId === documentId;
          const clickable = !!documentId;

          return (
            <li key={key} className={`sources-item${clickable ? " is-clickable" : ""}`}>
              <span className="sources-filename" title={label}>{label}</span>
              <div className="sources-item-right">
                {score != null ? (
                  <span className="sources-score" title="Relevance score">
                    {(score * 100).toFixed(0)}%
                  </span>
                ) : null}
                {clickable && (
                  <button
                    type="button"
                    className="sources-download-btn"
                    disabled={isDownloading}
                    onClick={() => handleDownload(documentId!, label)}
                    aria-label={`Download ${label}`}
                    title="Download source document"
                  >
                    {isDownloading
                      ? <span className="upload-spinner upload-spinner-sm" aria-hidden="true" />
                      : <DownloadIcon />}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {downloadError && (
        <p className="sources-error" role="alert">{downloadError}</p>
      )}
    </details>
  );
}
