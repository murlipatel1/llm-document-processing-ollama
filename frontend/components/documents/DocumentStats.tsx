type DocumentItem = {
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
};

type Props = {
  items: DocumentItem[];
};

export default function DocumentStats({ items }: Props) {
  const ready = items.filter((d) => d.status === "READY").length;
  const inProgress = items.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length;
  const failed = items.filter((d) => d.status === "FAILED").length;

  return (
    <div className="doc-stats">
      <div className="doc-stat-card">
        <span className="doc-stat-value">{items.length}</span>
        <span className="doc-stat-label">Total</span>
      </div>
      <div className="doc-stat-card doc-stat-ready">
        <span className="doc-stat-value">{ready}</span>
        <span className="doc-stat-label">Ready for chat</span>
      </div>
      <div className="doc-stat-card doc-stat-progress">
        <span className="doc-stat-value">{inProgress}</span>
        <span className="doc-stat-label">Processing</span>
      </div>
      <div className="doc-stat-card doc-stat-failed">
        <span className="doc-stat-value">{failed}</span>
        <span className="doc-stat-label">Failed</span>
      </div>
    </div>
  );
}
