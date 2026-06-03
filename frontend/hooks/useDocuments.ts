"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DocumentItem = {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorMsg?: string | null;
  chunkCount?: number;
  createdAt?: string;
};

export function useDocuments() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const { data } = await api.get("/api/documents");
      setItems(data.items || []);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/api/documents", formData);
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

  useEffect(() => {
    fetchDocuments().catch(() => undefined);
  }, []);

  useEffect(() => {
    const hasActive = items.some((doc) => doc.status === "PENDING" || doc.status === "PROCESSING");
    if (!hasActive) return;

    const timer = setInterval(() => {
      fetchDocuments({ silent: true }).catch(() => undefined);
    }, 4000);

    return () => clearInterval(timer);
  }, [items]);

  return { items, loading, fetchDocuments, uploadDocument, deleteDocument, reprocessDocument };
}
