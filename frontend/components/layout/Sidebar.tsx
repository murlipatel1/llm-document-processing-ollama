"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Chat" },
  { href: "/documents", label: "Documents" },
  { href: "/search", label: "Search" },
  { href: "/users", label: "Users" },
  { href: "/audit", label: "Audit" }
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <h3 className="sidebar-brand">Enterprise KB</h3>
      <p className="sidebar-tagline">Knowledge Workspace</p>
      <nav className="sidebar-nav">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`nav-link ${active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
