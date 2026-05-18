"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DocumentItem = {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
};

export function useDocuments() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/documents");
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/api/documents", formData);
    await fetchDocuments();
  };

  useEffect(() => {
    fetchDocuments().catch(() => undefined);
  }, []);

  useEffect(() => {
    const hasActive = items.some((doc) => doc.status === "PENDING" || doc.status === "PROCESSING");
    if (!hasActive) return;

    const timer = setInterval(() => {
      fetchDocuments().catch(() => undefined);
    }, 4000);

    return () => clearInterval(timer);
  }, [items]);

  return { items, loading, fetchDocuments, uploadDocument };
}
