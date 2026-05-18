"use client";

import RoleBadge from "./RoleBadge";
import { clearSession, getSession } from "@/lib/auth";
import ThemeToggle from "./ThemeToggle";

type NavbarProps = {
  onToggleSidebar: () => void;
};

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const session = getSession();

  return (
    <header className="app-header">
      <div className="header-left">
        <button type="button" className="secondary-btn nav-menu-btn" onClick={onToggleSidebar} aria-label="Open menu">
          Menu
        </button>
        <div>
          <p className="header-title">
            <strong>Knowledge Assistant</strong>
          </p>
          <p className="header-subtitle">Enterprise Document Intelligence</p>
        </div>
      </div>
      <div className="header-actions">
        <ThemeToggle />
        <RoleBadge role={(session?.role as "ADMIN" | "EDITOR" | "VIEWER") || "VIEWER"} />
        <button
          type="button"
          onClick={() => {
            clearSession();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
