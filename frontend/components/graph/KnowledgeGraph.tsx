"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphEdge, GraphNode } from "@/hooks/useGraph";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false }) as any;

const MAX_TOPICS = 6;
const MAX_CHUNKS = 2;

function mimeColor(mimeType?: string): string {
  if (!mimeType) return "#6366f1";
  if (mimeType.includes("pdf")) return "#6366f1";
  if (mimeType.includes("word") || mimeType.includes("docx") || mimeType.includes("doc"))
    return "#10b981";
  if (mimeType.includes("text") || mimeType.includes("plain") || mimeType.includes("markdown"))
    return "#f59e0b";
  return "#8b5cf6";
}

function mimeLabel(mimeType?: string): string {
  if (!mimeType) return "DOC";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("docx")) return "DOCX";
  if (mimeType.includes("msword")) return "DOC";
  if (mimeType.includes("markdown")) return "MD";
  if (mimeType.includes("text")) return "TXT";
  return "FILE";
}

function stemName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

function edgeEndpoint(edge: GraphEdge, side: "source" | "target"): string {
  const val = edge[side];
  return typeof val === "string" ? val : val.id;
}

function nodeColor(node: GraphNode): string {
  if (node.type === "topic") return "#f97316";
  if (node.type === "chunk") return "#14b8a6";
  return mimeColor(node.mimeType);
}

function fitRadius(
  width: number,
  height: number,
  nodeCount: number,
  mode: "ring" | "star"
): number {
  const shortSide = Math.min(width, height);
  // Leave room for node circle + label below
  const edgePad = mode === "ring" ? 56 : 48;
  const maxRadius = shortSide / 2 - edgePad;

  if (mode === "ring") {
    const ideal = shortSide * Math.min(0.34, 0.1 + nodeCount * 0.022);
    return Math.max(40, Math.min(maxRadius, ideal));
  }

  const ideal = shortSide * 0.26;
  return Math.max(36, Math.min(maxRadius, ideal));
}

/** Pin documents on a ring so they never collapse to the center. */
function layoutDocumentRing(docs: GraphNode[], width: number, height: number): GraphNode[] {
  if (!docs.length) return [];

  const radius = fitRadius(width, height, docs.length, "ring");

  return docs.map((node, i) => {
    const angle = (2 * Math.PI * i) / docs.length - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { ...node, x, y, fx: x, fy: y, vx: 0, vy: 0 };
  });
}

/** Star layout: expanded doc at center, children on an outer ring. */
function layoutExpandedStar(
  expandedDoc: GraphNode,
  children: GraphNode[],
  width: number,
  height: number
): GraphNode[] {
  const center = { ...expandedDoc, x: 0, y: 0, fx: 0, fy: 0, vx: 0, vy: 0 };

  if (!children.length) return [center];

  const childRadius = fitRadius(width, height, children.length, "star");
  const topics = children.filter((n) => n.type === "topic");
  const chunks = children.filter((n) => n.type === "chunk");
  const ordered = [...topics, ...chunks];

  const positionedChildren = ordered.map((node, i) => {
    const angle = (2 * Math.PI * i) / ordered.length - Math.PI / 2;
    const x = childRadius * Math.cos(angle);
    const y = childRadius * Math.sin(angle);
    return { ...node, x, y, fx: x, fy: y, vx: 0, vy: 0 };
  });

  return [center, ...positionedChildren];
}

type GraphLink = GraphEdge & { similarity?: number; weight?: number };

type TooltipState = { node: GraphNode; x: number; y: number } | null;

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  expandedDocId: string | null;
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode) => void;
  onBackgroundClick: () => void;
  filterMime: string;
};

export default function KnowledgeGraph({
  nodes,
  edges,
  expandedDocId,
  selectedNode,
  onNodeClick,
  onBackgroundClick,
  filterMime
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{
    zoomToFit?: (ms?: number, padding?: number) => void;
    centerAt?: (x?: number, y?: number, ms?: number) => void;
    zoom?: (scale: number, ms?: number) => void;
    d3Force?: (name: string, force?: unknown) => unknown;
  } | null>(null);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(500);
  const hoveredIdRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setWidth(Math.floor(el.clientWidth));
      setHeight(Math.floor(el.clientHeight));
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (hoveredIdRef.current) {
        setTooltip((prev) =>
          prev ? { ...prev, x: e.clientX + 16, y: e.clientY + 16 } : prev
        );
      }
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const { filteredNodes, filteredEdges } = useMemo(() => {
    let docs = nodes.filter((n) => n.type === "document");
    if (filterMime !== "all") {
      docs = docs.filter((n) => mimeLabel(n.mimeType) === filterMime);
    }

    if (!expandedDocId) {
      return {
        filteredNodes: layoutDocumentRing(docs, width, height),
        filteredEdges: [] as GraphEdge[]
      };
    }

    const expandedDoc = docs.find((d) => d.id === expandedDocId);
    if (!expandedDoc) {
      return {
        filteredNodes: layoutDocumentRing(docs, width, height),
        filteredEdges: [] as GraphEdge[]
      };
    }

    const childIds = new Set<string>();
    for (const e of edges) {
      if (e.type !== "contains" && e.type !== "mentions") continue;
      if (edgeEndpoint(e, "source") === expandedDocId) {
        childIds.add(edgeEndpoint(e, "target"));
      }
    }

    const children = nodes.filter((n) => childIds.has(n.id));
    const topics = children
      .filter((n) => n.type === "topic")
      .sort((a, b) => (b.docCount ?? 0) - (a.docCount ?? 0))
      .slice(0, MAX_TOPICS);
    const chunks = children.filter((n) => n.type === "chunk").slice(0, MAX_CHUNKS);
    const topicIds = new Set(topics.map((n) => n.id));
    const chunkIds = new Set(chunks.map((n) => n.id));

    const visEdges = edges.filter((e) => {
      if (e.type !== "contains" && e.type !== "mentions") return false;
      const src = edgeEndpoint(e, "source");
      const tgt = edgeEndpoint(e, "target");
      if (src !== expandedDocId) return false;
      return topicIds.has(tgt) || chunkIds.has(tgt);
    });

    return {
      filteredNodes: layoutExpandedStar(expandedDoc, [...topics, ...chunks], width, height),
      filteredEdges: visEdges
    };
  }, [nodes, edges, filterMime, expandedDocId, width, height]);

  const graphData = useMemo(
    () => ({
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredEdges.map((e) => ({ ...e }))
    }),
    [filteredNodes, filteredEdges]
  );

  // Fit camera to pinned layout whenever graph content or canvas size changes
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || width < 50 || height < 50 || !graphData.nodes.length) return;

    fg.d3Force?.("center", null);

    const timer = setTimeout(() => {
      fg.zoomToFit?.(350, 64);
    }, 120);

    return () => clearTimeout(timer);
  }, [graphData.nodes.length, expandedDocId, filterMime, width, height]);

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isExpandedDoc = node.id === expandedDocId;
      const isSelected = node.id === selectedNode?.id;
      const isHovered = node.id === hoveredIdRef.current;
      const color = nodeColor(node);

      let r = 5;
      if (node.type === "document") r = Math.max(12, Math.floor(Math.sqrt((node.val ?? 8) * 1.4)));
      else if (node.type === "topic") r = Math.max(6, Math.sqrt((node.val ?? 4) * 1.6));
      else r = Math.max(5, Math.sqrt((node.val ?? 3) * 1.4));

      if (isExpandedDoc || isSelected || isHovered) {
        ctx.beginPath();
        if (node.type === "topic") drawDiamond(ctx, x, y, r + 5);
        else ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
        ctx.fillStyle = isExpandedDoc ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.12)";
        ctx.fill();
      }

      if (node.type === "document" && !expandedDocId && !isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      if (node.type === "topic") drawDiamond(ctx, x, y, r);
      else if (node.type === "chunk") {
        const s = r * 1.2;
        ctx.rect(x - s, y - s, s * 2, s * 2);
      } else {
        ctx.arc(x, y, r, 0, 2 * Math.PI);
      }
      ctx.fillStyle = color;
      ctx.fill();

      ctx.lineWidth = isExpandedDoc || isSelected ? 2.5 / globalScale : 1 / globalScale;
      ctx.strokeStyle = isExpandedDoc || isSelected ? "#ffffff" : "rgba(255,255,255,0.35)";
      ctx.stroke();

      const showLabel =
        node.type === "document" ||
        (expandedDocId && (node.type === "topic" || node.type === "chunk"));

      if (showLabel) {
        const label =
          node.type === "document"
            ? stemName(node.label || node.filename || "").slice(0, 20)
            : node.type === "topic"
              ? (node.label || "").slice(0, 16)
              : (node.label || "").slice(0, 24);

        const fontSize = Math.max(8, (node.type === "document" ? 10 : 8) / globalScale);
        ctx.font = `${node.type === "document" ? 700 : 600} ${fontSize}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const tw = ctx.measureText(label).width;
        const ty = y + r + 4;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(x - tw / 2 - 4, ty, tw + 8, fontSize + 5);
        ctx.fillStyle = "rgba(255,255,255,0.93)";
        ctx.fillText(label, x, ty + 2);
      }
    },
    [expandedDocId, selectedNode]
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    hoveredIdRef.current = node?.id ?? null;
    if (!node) setTooltip(null);
    else setTooltip((prev) => ({ node, x: prev?.x ?? 0, y: prev?.y ?? 0 }));
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => onNodeClick(node),
    [onNodeClick]
  );

  return (
    <div ref={containerRef} className="graph-canvas-inner">
      <ForceGraph2D
        ref={graphRef}
        width={width}
        height={height}
        graphData={graphData}
        nodeId="id"
        nodeLabel=""
        enableNodeDrag={false}
        nodeVal={() => 1}
        nodePointerArea={(node: GraphNode) =>
          node.type === "document" ? 280 : node.type === "topic" ? 180 : 160
        }
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => "replace"}
        linkWidth={(l: GraphLink) => (l.type === "mentions" ? 1.4 : 1)}
        linkColor={(l: GraphLink) =>
          l.type === "mentions" ? "rgba(249,115,22,0.6)" : "rgba(20,184,166,0.45)"
        }
        linkLineDash={(l: GraphLink) => (l.type === "contains" ? [4, 3] : null)}
        linkDirectionalParticles={expandedDocId ? 2 : 0}
        linkDirectionalParticleWidth={2}
        d3AlphaDecay={0.08}
        d3VelocityDecay={0.55}
        warmupTicks={0}
        cooldownTicks={0}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={onBackgroundClick}
        onEngineStop={() => graphRef.current?.zoomToFit?.(300, 64)}
        backgroundColor="transparent"
      />

      {!expandedDocId && filteredNodes.length > 0 && (
        <div className="graph-canvas-cta">Click any document to explore connections</div>
      )}

      {tooltip && (
        <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }} aria-hidden="true">
          <p className="graph-tooltip-type">{tooltip.node.type.toUpperCase()}</p>
          <p className="graph-tooltip-name">
            {tooltip.node.type === "document" ? tooltip.node.filename : tooltip.node.label}
          </p>
          {tooltip.node.type === "document" && !expandedDocId && (
            <span className="graph-tooltip-meta">Click to expand topics &amp; chunks</span>
          )}
          {tooltip.node.type === "document" && expandedDocId && (
            <span className="graph-tooltip-meta">
              {mimeLabel(tooltip.node.mimeType)} · {tooltip.node.chunkCount} chunks
            </span>
          )}
          {tooltip.node.type === "topic" && (
            <span className="graph-tooltip-meta">
              Shared across {tooltip.node.docCount} document{tooltip.node.docCount === 1 ? "" : "s"}
            </span>
          )}
          {tooltip.node.type === "chunk" && (
            <span className="graph-tooltip-meta">From {tooltip.node.parentFilename}</span>
          )}
        </div>
      )}
    </div>
  );
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}
