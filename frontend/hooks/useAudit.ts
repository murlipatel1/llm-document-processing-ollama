"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type AuditLogItem = {
  id: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user: { email: string; role: string | null };
};

type Filters = {
  search: string;
  method: string;
};

export function useAudit() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: "", method: "" });

  const fetchAudit = useCallback(async (activeFilters?: Filters) => {
    const f = activeFilters ?? filters;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (f.search.trim()) params.search = f.search.trim();
      if (f.method) params.method = f.method;

      const { data } = await api.get("/api/audit", { params });
      setItems(data.items || []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setError("Only administrators can view audit logs.");
      } else {
        setError("Failed to load audit logs. Please try again.");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAudit().catch(() => undefined);
  }, []);

  const applyFilters = () => fetchAudit(filters);

  const clearFilters = () => {
    const cleared = { search: "", method: "" };
    setFilters(cleared);
    return fetchAudit(cleared);
  };

  return {
    items,
    loading,
    error,
    filters,
    setFilters,
    fetchAudit,
    applyFilters,
    clearFilters
  };
}
