"use client";

import { useState } from "react";
import KnowledgeGraph from "@/components/graph/KnowledgeGraph";
import NodePanel from "@/components/graph/NodePanel";
import GraphHints from "@/components/graph/GraphHints";
import type { GraphNode } from "@/hooks/useGraph";
import { useGraph } from "@/hooks/useGraph";

const MIME_FILTERS = [
  { id: "all", label: "All files" },
  { id: "PDF", label: "PDF" },
  { id: "DOCX", label: "DOCX" },
  { id: "TXT", label: "TXT" },
  { id: "MD", label: "MD" }
];

export default function GraphPage() {
  const { data, loading, error, fetchGraph } = useGraph();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [filterMime, setFilterMime] = useState("all");
  const [hintsDismissed, setHintsDismissed] = useState(false);

  const stats = data.stats ?? {
    documents: data.nodes.filter((n) => n.type === "document").length,
    topics: data.nodes.filter((n) => n.type === "topic").length,
    chunks: data.nodes.filter((n) => n.type === "chunk").length,
    edges: data.edges.length
  };

  const docCount = stats.documents;

  const handleNodeClick = (node: GraphNode) => {
    if (node.type === "document") {
      setExpandedDocId((prev) => (prev === node.id ? null : node.id));
    }
    setSelectedNode(node);
  };

  const handleBackgroundClick = () => {
    setExpandedDocId(null);
    setSelectedNode(null);
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
    setExpandedDocId(null);
  };

  return (
    <section className="graph-page">
      <header className="graph-page-header">
        <div>
          <h2 className="page-header">Knowledge Graph</h2>
          <p className="subtext">
            Start with documents only — click one to reveal its topics and text chunks.
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => fetchGraph()}
          disabled={loading}
          style={{ fontSize: "0.88rem", flexShrink: 0 }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      <div className="graph-controls">
        <div className="graph-stats-row">
          <span className="graph-stat-chip">
            <span className="graph-stat-dot" style={{ background: "#6366f1" }} />
            {stats.documents} docs
          </span>
          <span className="graph-stat-chip">
            <span className="graph-stat-dot" style={{ background: "#f97316" }} />
            {stats.topics} topics
          </span>
          <span className="graph-stat-chip">
            <span className="graph-stat-dot" style={{ background: "#14b8a6" }} />
            {stats.chunks} chunks
          </span>
        </div>

        <div className="graph-filter-row">
          <span className="graph-filter-label">Files:</span>
          {MIME_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`graph-filter-btn ${filterMime === f.id ? "active" : ""}`}
              onClick={() => {
                setFilterMime(f.id);
                setExpandedDocId(null);
                setSelectedNode(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {expandedDocId && (
          <button type="button" className="graph-collapse-btn" onClick={handleBackgroundClick}>
            Collapse view
          </button>
        )}
      </div>

      <div className="graph-body">
        <div className="graph-canvas-container">
          {loading && (
            <div className="graph-loading-overlay">
              <span className="graph-spinner" />
              <p>Building knowledge graph…</p>
            </div>
          )}

          {!loading && error && (
            <div className="graph-error-state">
              <p className="error-text">{error}</p>
              <button type="button" onClick={() => fetchGraph()} className="secondary-btn">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && docCount === 0 && (
            <div className="graph-empty-state">
              <h3>No indexed documents yet</h3>
              <p className="subtext">
                Upload documents and wait until they are{" "}
                <span className="graph-ready-badge">READY</span>.
              </p>
            </div>
          )}

          {!loading && !error && docCount > 0 && (
            <>
              <KnowledgeGraph
                nodes={data.nodes}
                edges={data.edges}
                expandedDocId={expandedDocId}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                filterMime={filterMime}
              />
              {!hintsDismissed && (
                <GraphHints
                  expanded={Boolean(expandedDocId)}
                  onDismiss={() => setHintsDismissed(true)}
                />
              )}
            </>
          )}
        </div>

        <NodePanel
          node={selectedNode}
          edges={data.edges}
          allNodes={data.nodes}
          onClose={handleClosePanel}
          onSelectNode={(node) => {
            if (node.type === "document") {
              setExpandedDocId(node.id);
            }
            setSelectedNode(node);
          }}
        />
      </div>
    </section>
  );
}
