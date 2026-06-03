type Props = {
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
};

const statusClass = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed"
} as const;

const statusLabel = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed"
} as const;

export default function ProcessingBadge({ status }: Props) {
  return (
    <span className={`status-badge ${statusClass[status]}`}>
      {status === "PROCESSING" ? (
        <span className="status-badge-dot" aria-hidden="true" />
      ) : null}
      {statusLabel[status]}
    </span>
  );
}
