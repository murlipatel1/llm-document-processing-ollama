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

  const search = async (query: string) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/search", { params: { query } });
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, search };
}
