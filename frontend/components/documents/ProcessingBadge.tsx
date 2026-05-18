type Props = {
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
};

const statusClass = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed"
} as const;

export default function ProcessingBadge({ status }: Props) {
  return <span className={`status-badge ${statusClass[status]}`}>{status}</span>;
}
