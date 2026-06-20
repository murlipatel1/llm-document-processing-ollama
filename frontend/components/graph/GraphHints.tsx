"use client";

type Props = {
  expanded: boolean;
  onDismiss?: () => void;
};

export default function GraphHints({ expanded, onDismiss }: Props) {
  return (
    <div className="graph-hints" role="note">
      <div className="graph-hints-header">
        <span className="graph-hints-icon" aria-hidden="true">💡</span>
        <strong>How to explore</strong>
        {onDismiss && (
          <button type="button" className="graph-hints-dismiss" onClick={onDismiss} aria-label="Dismiss hints">
            ✕
          </button>
        )}
      </div>
      <ul className="graph-hints-list">
        <li>
          <span className="graph-hints-key">Click</span> a document to expand its topics &amp; chunks
        </li>
        <li>
          <span className="graph-hints-key">Click again</span> or the background to collapse
        </li>
        <li>Drag to pan · Scroll to zoom</li>
      </ul>
      <div className="graph-hints-legend">
        <span><i className="graph-hint-dot graph-hint-dot-doc" />Document</span>
        <span><i className="graph-hint-dot graph-hint-dot-topic" />Topic</span>
        <span><i className="graph-hint-dot graph-hint-dot-chunk" />Chunk</span>
      </div>
      {expanded && (
        <p className="graph-hints-expanded-note">Showing connections for selected document</p>
      )}
    </div>
  );
}
