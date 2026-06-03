"use client";

import { useState } from "react";
import type { AuditLogItem } from "@/hooks/useAudit";

type Props = {
  items: AuditLogItem[];
};

const METHOD_CLASS: Record<string, string> = {
  GET: "audit-method-get",
  POST: "audit-method-post",
  PUT: "audit-method-put",
  PATCH: "audit-method-patch",
  DELETE: "audit-method-delete"
};

function parseAction(action: string) {
  const [method, ...rest] = action.split(" ");
  return { method: method?.toUpperCase() || "?", path: rest.join(" ") || action };
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleString();
}

function shortenUserAgent(ua?: string | null) {
  if (!ua) return "—";
  if (ua.length <= 60) return ua;
  return `${ua.slice(0, 57)}…`;
}

export default function AuditLogList({ items }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!items.length) {
    return (
      <div className="audit-empty doc-empty">
        <div className="doc-empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="doc-empty-title">No audit entries match your filters</p>
        <p className="subtext">Try clearing filters or perform actions in the app to generate logs.</p>
      </div>
    );
  }

  return (
    <ul className="audit-list" role="list">
      {items.map((log) => {
        const { method, path } = parseAction(log.action);
        const methodClass = METHOD_CLASS[method] || "audit-method-other";
        const expanded = expandedId === log.id;
        const statusCode =
          typeof log.metadata === "object" && log.metadata
            ? (log.metadata as { statusCode?: number }).statusCode
            : undefined;

        return (
          <li key={log.id} className="audit-card">
            <div className="audit-card-main">
              <span className={`audit-method-badge ${methodClass}`}>{method}</span>

              <div className="audit-card-content">
                <p className="audit-card-path" title={path}>
                  {path}
                </p>
                <p className="audit-card-meta">
                  <span className="audit-user">{log.user.email}</span>
                  {log.user.role ? (
                    <span className="role-pill">{log.user.role}</span>
                  ) : null}
                  <span className="audit-card-time">{formatRelativeTime(log.createdAt)}</span>
                  {statusCode != null ? (
                    <span
                      className={`audit-status-code${statusCode >= 400 ? " is-error" : ""}`}
                    >
                      {statusCode}
                    </span>
                  ) : null}
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn audit-expand-btn"
                onClick={() => setExpandedId(expanded ? null : log.id)}
                aria-expanded={expanded}
              >
                {expanded ? "Less" : "Details"}
              </button>
            </div>

            {expanded ? (
              <div className="audit-card-details">
                <dl className="audit-detail-grid">
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{new Date(log.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>IP address</dt>
                    <dd>{log.ipAddress || "—"}</dd>
                  </div>
                  <div>
                    <dt>Resource</dt>
                    <dd>{log.resource}</dd>
                  </div>
                  <div className="audit-detail-wide">
                    <dt>User agent</dt>
                    <dd title={log.userAgent || undefined}>{shortenUserAgent(log.userAgent)}</dd>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 ? (
                    <div className="audit-detail-wide">
                      <dt>Metadata</dt>
                      <dd>
                        <pre className="audit-metadata-pre">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
