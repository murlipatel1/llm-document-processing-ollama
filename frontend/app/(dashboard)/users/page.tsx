"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserRow = {
  id: string;
  email: string;
  role: string;
};

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);

  useEffect(() => {
    api
      .get("/api/users")
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <section className="card">
      <h2 className="page-header">Users</h2>
      <p className="subtext">Tenant users and access roles.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th align="left">Email</th>
              <th align="left">Role</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
