"use client";

import Link from "next/link";
import type { GraphEdge, GraphNode } from "@/hooks/useGraph";

function mimeLabel(mimeType?: string): string {
  if (!mimeType) return "FILE";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("docx")) return "DOCX";
  if (mimeType.includes("msword")) return "DOC";
  if (mimeType.includes("markdown")) return "MD";
  if (mimeType.includes("text")) return "TXT";
  return "FILE";
}

function mimeColorClass(mimeType?: string): string {
  if (!mimeType) return "graph-badge-file";
  if (mimeType.includes("pdf")) return "graph-badge-pdf";
  if (mimeType.includes("word") || mimeType.includes("doc")) return "graph-badge-docx";
  if (mimeType.includes("text") || mimeType.includes("markdown")) return "graph-badge-txt";
  return "graph-badge-file";
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function edgeLabel(edge: GraphEdge): string {
  if (edge.type === "mentions") return "mentions";
  if (edge.type === "contains") return "contains";
  if (edge.type === "shared_concept") return `${Math.round((edge.similarity ?? 0.5) * 100)}%`;
  if (edge.type === "related") return `${Math.round((edge.similarity ?? 0.5) * 100)}% shared`;
  return "linked";
}

type Props = {
  node: GraphNode | null;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onSelectNode?: (node: GraphNode) => void;
};

export default function NodePanel({ node, edges, allNodes, onClose, onSelectNode }: Props) {
  if (!node) {
    return (
      <div className="graph-node-panel graph-node-panel-empty">
        <div className="graph-panel-empty-icon" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.8 9.2l2.5 0.4M10.8 14.8l2.5-0.4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
        <p className="graph-panel-empty-title">Click any node</p>
        <p className="subtext" style={{ fontSize: "0.82rem", textAlign: "center" }}>
          Documents, topics, and chunks are connected — explore how your knowledge links together.
        </p>
      </div>
    );
  }

  const nodeId = node.id;
  const neighbourEdges = edges.filter((e) => {
    const src = typeof e.source === "string" ? e.source : e.source.id;
    const tgt = typeof e.target === "string" ? e.target : e.target.id;
    return src === nodeId || tgt === nodeId;
  });

  const neighbours = neighbourEdges
    .map((edge) => {
      const src = typeof edge.source === "string" ? edge.source : edge.source.id;
      const tgt = typeof edge.target === "string" ? edge.target : edge.target.id;
      const otherId = src === nodeId ? tgt : src;
      const other = allNodes.find((n) => n.id === otherId);
      if (!other) return null;
      return { node: other, edge };
    })
    .filter(Boolean) as { node: GraphNode; edge: GraphEdge }[];

  const chatSubject =
    node.type === "document"
      ? node.filename?.replace(/\.[^/.]+$/, "") || node.label
      : node.type === "topic"
        ? node.label
        : node.parentFilename?.replace(/\.[^/.]+$/, "") || "this content";

  const chatQuery = encodeURIComponent(`Tell me about "${chatSubject}" from the knowledge base.`);

  const badgeClass =
    node.type === "topic"
      ? "graph-badge-topic"
      : node.type === "chunk"
        ? "graph-badge-chunk"
        : mimeColorClass(node.mimeType);

  const badgeText =
    node.type === "topic" ? "TOPIC" : node.type === "chunk" ? "CHUNK" : mimeLabel(node.mimeType);

  return (
    <div className="graph-node-panel">
      <div className="graph-panel-header">
        <div className="graph-panel-title-row">
          <span className={`graph-type-badge ${badgeClass}`}>{badgeText}</span>
          <button type="button" className="graph-panel-close" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>
        <h3 className="graph-panel-filename" title={node.label}>
          {node.type === "document" ? node.filename : node.label}
        </h3>
        <p className="graph-panel-meta">
          {node.type === "document" && (
            <>
              <span>{node.chunkCount} chunks</span>
              {node.createdAt && (
                <>
                  <span className="graph-panel-sep">·</span>
                  <span>{relativeTime(node.createdAt)}</span>
                </>
              )}
            </>
          )}
          {node.type === "topic" && (
            <span>Connects {node.docCount} document{node.docCount === 1 ? "" : "s"}</span>
          )}
          {node.type === "chunk" && (
            <>
              <span>Chunk #{((node.chunkIndex ?? 0) + 1)}</span>
              {node.parentFilename && (
                <>
                  <span className="graph-panel-sep">·</span>
                  <span>{node.parentFilename}</span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      {(node.summary || node.chunkText) && (
        <div className="graph-panel-section">
          <p className="graph-panel-section-label">
            {node.type === "chunk" ? "Chunk text" : "Summary"}
          </p>
          <p className="graph-panel-summary">{node.summary || node.chunkText}</p>
        </div>
      )}

      <div className="graph-panel-section graph-panel-actions">
        <Link href={`/chat?q=${chatQuery}`} className="graph-action-btn graph-action-primary">
          Chat about this
        </Link>
        {node.type === "document" && (
          <Link href="/documents" className="graph-action-btn graph-action-secondary">
            View in Documents
          </Link>
        )}
      </div>

      {neighbours.length > 0 && (
        <div className="graph-panel-section">
          <p className="graph-panel-section-label">Connected ({neighbours.length})</p>
          <ul className="graph-neighbours-list">
            {neighbours.map(({ node: n, edge }) => (
              <li key={n.id} className="graph-neighbour-item">
                <button
                  type="button"
                  className="graph-neighbour-btn"
                  onClick={() => onSelectNode?.(n)}
                >
                  <span
                    className={`graph-type-badge graph-type-badge-sm ${
                      n.type === "topic"
                        ? "graph-badge-topic"
                        : n.type === "chunk"
                          ? "graph-badge-chunk"
                          : mimeColorClass(n.mimeType)
                    }`}
                  >
                    {n.type === "topic" ? "TOPIC" : n.type === "chunk" ? "CHUNK" : mimeLabel(n.mimeType)}
                  </span>
                  <span className="graph-neighbour-name" title={n.label}>
                    {(n.type === "document" ? n.filename : n.label)?.slice(0, 28)}
                  </span>
                  <span className="graph-similarity-pill">{edgeLabel(edge)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
