"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, saveSession } from "@/lib/auth";
import PasswordInput from "@/components/auth/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSession()?.accessToken) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.user?.role || "VIEWER"
      });
      router.push("/");
    } catch {
      setError("Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <h1 className="page-header">Login</h1>
        <p className="subtext">Sign in to access enterprise knowledge assistant.</p>
        <form onSubmit={handleSubmit} className="stack" style={{ marginTop: "1rem" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            placeholder="Password"
            required
          />
          <button type="submit">{loading ? "Signing in..." : "Sign in"}</button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
        <p style={{ marginBottom: 0 }}>
          No account? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
