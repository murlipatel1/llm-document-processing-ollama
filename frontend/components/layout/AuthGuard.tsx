"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSession } from "@/lib/auth";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) {
      window.location.href = "/login";
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="page-loading">Checking session...</div>;
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
