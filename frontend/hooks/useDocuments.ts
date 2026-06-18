"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";

export type DocumentItem = {
  id: string;
  filename: string;
  mimeType?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorMsg?: string | null;
  chunkCount?: number;
  createdAt?: string;
};

export type UploadFileState = {
  id: string;
  file: File;
  progress: number;
  error: string | null;
  done: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useDocuments() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const { data } = await api.get("/api/documents");
      setItems(data.items || []);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  /** Upload a single file with optional progress callback. Refreshes list on success. */
  const uploadDocument = async (
    file: File,
    onProgress?: (pct: number) => void
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/api/documents", formData, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      }
    });
    await fetchDocuments();
  };

  const deleteDocument = async (documentId: string) => {
    await api.delete(`/api/documents/${documentId}`);
    await fetchDocuments();
  };

  const reprocessDocument = async (documentId: string) => {
    await api.post(`/api/documents/${documentId}/reprocess`);
    await fetchDocuments();
  };

  /** Trigger a browser download for a document (streams through Fastify with auth). */
  const downloadDocument = async (documentId: string, filename: string) => {
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
  };

  /**
   * Fetch the file content for preview.
   * Returns a blob URL (caller must revoke it when done).
   */
  const getPreviewUrl = async (documentId: string): Promise<string> => {
    const session = getSession();
    const response = await fetch(`${API_BASE}/api/documents/${documentId}/preview`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` }
    });
    if (!response.ok) throw new Error("Preview unavailable");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    fetchDocuments().catch(() => undefined);
  }, []);

  useEffect(() => {
    const hasActive = items.some(
      (doc) => doc.status === "PENDING" || doc.status === "PROCESSING"
    );
    if (!hasActive) return;

    const timer = setInterval(() => {
      fetchDocuments({ silent: true }).catch(() => undefined);
    }, 4000);

    return () => clearInterval(timer);
  }, [items]);

  return {
    items,
    loading,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    reprocessDocument,
    downloadDocument,
    getPreviewUrl
  };
}
