"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type GraphNodeType = "document" | "topic" | "chunk";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  filename?: string;
  chunkCount?: number;
  summary?: string | null;
  mimeType?: string;
  createdAt?: string;
  chunkText?: string;
  documentId?: string;
  parentFilename?: string;
  chunkIndex?: number;
  docCount?: number;
  val?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type GraphEdgeType = "contains" | "mentions" | "shared_concept" | "semantic" | "related";

export type GraphEdge = {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: GraphEdgeType;
  similarity?: number;
  weight?: number;
};

export type GraphStats = {
  documents: number;
  topics: number;
  chunks: number;
  edges: number;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: GraphStats;
};

export function useGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.6);

  const fetchGraph = useCallback(
    async (opts?: { threshold?: number; silent?: boolean }) => {
      const t = opts?.threshold ?? threshold;
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const { data: res } = await api.get("/api/documents/graph", {
          params: { threshold: t, maxNodes: 50 }
        });
        setData(res);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          (err as Error)?.message ??
          "Failed to load graph";
        setError(msg);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [threshold]
  );

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const applyThreshold = (t: number) => {
    setThreshold(t);
    fetchGraph({ threshold: t });
  };

  return { data, loading, error, threshold, applyThreshold, fetchGraph };
}
