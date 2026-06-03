import type { AuditLogItem } from "@/hooks/useAudit";

type Props = {
  items: AuditLogItem[];
};

function parseMethod(action: string) {
  return action.split(" ")[0]?.toUpperCase() || "OTHER";
}

function isToday(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function AuditStats({ items }: Props) {
  const today = items.filter((log) => isToday(log.createdAt)).length;
  const mutations = items.filter((log) => {
    const m = parseMethod(log.action);
    return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
  }).length;
  const uniqueUsers = new Set(items.map((log) => log.user.email)).size;
  const failed = items.filter((log) => {
    const code =
      typeof log.metadata === "object" && log.metadata
        ? (log.metadata as { statusCode?: number }).statusCode
        : undefined;
    return code != null && code >= 400;
  }).length;

  return (
    <div className="audit-stats doc-stats">
      <div className="doc-stat-card">
        <span className="doc-stat-value">{items.length}</span>
        <span className="doc-stat-label">Shown (latest)</span>
      </div>
      <div className="doc-stat-card doc-stat-ready">
        <span className="doc-stat-value">{today}</span>
        <span className="doc-stat-label">Today</span>
      </div>
      <div className="doc-stat-card doc-stat-progress">
        <span className="doc-stat-value">{mutations}</span>
        <span className="doc-stat-label">Mutations</span>
      </div>
      <div className="doc-stat-card">
        <span className="doc-stat-value">{uniqueUsers}</span>
        <span className="doc-stat-label">Active users</span>
      </div>
      {failed > 0 ? (
        <div className="doc-stat-card doc-stat-failed">
          <span className="doc-stat-value">{failed}</span>
          <span className="doc-stat-label">4xx/5xx responses</span>
        </div>
      ) : null}
    </div>
  );
}
