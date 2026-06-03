"use client";

import { useState } from "react";
import AuditLogList from "@/components/audit/AuditLogList";
import AuditStats from "@/components/audit/AuditStats";
import { useAudit } from "@/hooks/useAudit";
import { getSession } from "@/lib/auth";

const HTTP_METHODS = ["", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export default function AuditPage() {
  const {
    items,
    loading,
    error,
    filters,
    setFilters,
    fetchAudit,
    applyFilters,
    clearFilters
  } = useAudit();
  const [refreshing, setRefreshing] = useState(false);
  const session = getSession();
  const isAdmin = session?.role === "ADMIN";

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAudit();
    } finally {
      setRefreshing(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="card documents-page">
        <h2 className="page-header">Audit Logs</h2>
        <div className="documents-viewer-notice" role="alert">
          <span className="documents-viewer-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <strong>Admin access required</strong>
            <p className="subtext" style={{ margin: "0.2rem 0 0" }}>
              Only administrators can view tenant audit logs.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card documents-page audit-page">
      <header className="documents-header">
        <div>
          <h2 className="page-header">Audit Logs</h2>
          <p className="subtext">
            Security and compliance trail for uploads, user changes, chat, and API mutations in
            your tenant.
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn documents-refresh-btn"
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          {refreshing || loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {!error && !loading ? <AuditStats items={items} /> : null}

      <div className="audit-filters">
        <div className="audit-filter-field">
          <label htmlFor="audit-search">Search</label>
          <input
            id="audit-search"
            type="search"
            placeholder="Email, path, IP…"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
        </div>
        <div className="audit-filter-field audit-filter-method">
          <label htmlFor="audit-method">Method</label>
          <select
            id="audit-method"
            value={filters.method}
            onChange={(e) => setFilters((prev) => ({ ...prev, method: e.target.value }))}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m || "all"} value={m}>
                {m || "All methods"}
              </option>
            ))}
          </select>
        </div>
        <div className="audit-filter-actions">
          <button type="button" className="secondary-btn" onClick={applyFilters} disabled={loading}>
            Apply
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => clearFilters()}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </div>

      <section className="documents-list-section" aria-labelledby="audit-list-heading">
        <h3 id="audit-list-heading" className="documents-list-heading">
          Activity
          {!loading && items.length > 0 ? (
            <span className="documents-list-count">{items.length}</span>
          ) : null}
        </h3>

        {loading && !items.length ? (
          <div className="documents-loading">
            <span className="upload-spinner" aria-hidden="true" />
            <p className="subtext">Loading audit logs…</p>
          </div>
        ) : (
          <AuditLogList items={items} />
        )}
      </section>

      <p className="audit-footnote subtext">
        Logs capture POST/PUT/PATCH/DELETE actions and sensitive reads. Routine GET polling is not
        recorded to reduce noise.
      </p>
    </section>
  );
}
