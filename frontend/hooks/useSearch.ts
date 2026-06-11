"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type SearchItem = {
  id: string;
  text: string;
  score?: number;
};

export function useSearch() {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = async (query: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const { data } = await api.get("/api/search", { params: { query } });
      setItems(data.items || []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Too many search requests. Please wait a moment and try again.");
      } else {
        setError("Search failed. Please check your connection and try again.");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, error, hasSearched, search };
}
