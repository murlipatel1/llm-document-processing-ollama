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
    try {
      await api.patch(`/api/users/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update role";
      alert(msg);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/users/${userId}`);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to delete user";
      alert(msg);
    }
  };

  return (
    <section className="card">
      <h2 className="page-header">Users</h2>
      <p className="subtext">Tenant users and access roles.{!isAdmin && " Only admins can manage users."}</p>
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
                        onClick={() => deleteUser(user.id, user.email)}
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
