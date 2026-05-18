"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AuditRow = {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);

  useEffect(() => {
    api
      .get("/api/audit")
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <section className="card">
      <h2 className="page-header">Audit Logs</h2>
      <p className="subtext">Recent tenant activity captured by backend hooks.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th align="left">Action</th>
              <th align="left">Resource</th>
              <th align="left">When</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id}>
                <td>{log.action}</td>
                <td>{log.resource}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
