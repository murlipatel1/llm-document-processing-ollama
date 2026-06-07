"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";

type UserRow = {
  id: string;
  email: string;
  role: string;
};

const ROLES = ["VIEWER", "EDITOR", "ADMIN"] as const;

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);

  const session = getSession();
  const isAdmin = session?.role === "ADMIN";

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setItems(res.data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeRole = async (userId: string, newRole: string) => {
    setError(null);
    try {
      await api.patch(`/api/users/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update role";
      setError(msg);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setError(null);
    try {
      await api.delete(`/api/users/${pendingDelete.id}`);
      setPendingDelete(null);
      await fetchUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete user";
      setError(msg);
      setPendingDelete(null);
    }
  };

  return (
    <section className="card">
      <h2 className="page-header">Users</h2>
      <p className="subtext">
        Tenant users and access roles.{!isAdmin && " Only admins can manage users."}
      </p>

      {error && (
        <div
          role="alert"
          style={{
            margin: "0.75rem 0",
            padding: "0.65rem 1rem",
            borderRadius: "6px",
            background: "var(--color-danger-bg, #fee2e2)",
            color: "var(--color-danger, #b91c1c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            fontSize: "0.9rem"
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {pendingDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{
            margin: "0.75rem 0",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            background: "var(--color-warning-bg, #fef3c7)",
            color: "var(--color-warning, #92400e)",
            fontSize: "0.9rem"
          }}
        >
          <p style={{ marginBottom: "0.5rem" }}>
            Permanently delete <strong>{pendingDelete.email}</strong>? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="danger-btn" onClick={confirmDelete}
              style={{ fontSize: "0.82rem", padding: "0.3rem 0.7rem" }}>
              Yes, delete
            </button>
            <button type="button" onClick={() => setPendingDelete(null)}
              style={{ fontSize: "0.82rem", padding: "0.3rem 0.7rem" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="subtext">Loading users...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th align="left">Email</th>
                <th align="left">Role</th>
                {isAdmin && <th align="left">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                        style={{ padding: "0.25rem 0.4rem", fontSize: "0.85rem" }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <button
                        type="button"
                        className="danger-btn"
                        style={{ fontSize: "0.82rem", padding: "0.3rem 0.7rem" }}
                        onClick={() => setPendingDelete(user)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
