"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import AuthGuard from "@/components/layout/AuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="dashboard-shell">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <button
          type="button"
          aria-label="Close sidebar"
          className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className="dashboard-main">
          <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <main className="container">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
