"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, saveSession } from "@/lib/auth";
import PasswordInput from "@/components/auth/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
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
      const { data } = await api.post("/api/auth/register", { tenantName, email, password });
      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.user?.role || "ADMIN"
      });
      router.push("/");
    } catch {
      setError("Unable to register. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <h1 className="page-header">Create account</h1>
        <p className="subtext">Create your tenant and admin user in one step.</p>
        <form onSubmit={handleSubmit} className="stack" style={{ marginTop: "1rem" }}>
          <input
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Tenant name"
            required
          />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <PasswordInput
            id="register-password"
            value={password}
            onChange={setPassword}
            placeholder="Password"
            required
          />
          <button type="submit">{loading ? "Creating..." : "Create account"}</button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
        <p style={{ marginBottom: 0 }}>
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
