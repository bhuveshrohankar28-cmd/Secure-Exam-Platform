"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/api/client";

const ADMIN_USERNAME = "ADMIN001";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-text-primary)",
  fontSize: "1rem", // 16px stops iOS Safari zooming on focus
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "var(--color-text-secondary)",
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = username.trim().toUpperCase() === ADMIN_USERNAME;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (isAdmin && !password) {
      setError("Please enter the admin password.");
      return;
    }
    if (!isAdmin && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(
        username.trim(),
        isAdmin ? password : undefined,
        isAdmin ? undefined : name.trim()
      );

      const token = response.data?.token || (response as unknown as { token?: string }).token;
      const user = response.data?.user || (response as unknown as { user?: { role?: string } }).user;

      if (response.success && token) {
        setAuthToken(token);
        if (typeof window !== "undefined" && user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        const role = user?.role;
        if (role === "admin" || role === "superadmin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      } else {
        setError(response.error || "Login failed. Please check your details.");
      }
    } catch {
      setError("Unable to connect to the backend server. Is it running on port 5000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--gradient-hero)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div className="glass-card" style={{ padding: "36px 30px", width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "6px" }}>🛡️</div>
          <h1 className="gradient-text" style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            Examination Portal
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "6px", fontSize: "0.88rem" }}>
            Sign in or create an account to access available tests
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
              color: "#f87171",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="login-username" style={labelStyle}>
              Username
            </label>
            <input
              id="login-username"
              type="text"
              placeholder="Choose or enter a username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              disabled={loading}
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              style={{
                ...inputStyle,
                letterSpacing: "0.04em",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            />
          </div>

          {isAdmin ? (
            <div>
              <label htmlFor="login-password" style={labelStyle}>
                Admin Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={inputStyle}
              />
            </div>
          ) : (
            <div>
              <label htmlFor="login-name" style={labelStyle}>
                Full Name
              </label>
              <input
                id="login-name"
                type="text"
                placeholder="e.g. Yash Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                style={inputStyle}
              />
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--gradient-primary)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "4px",
              boxShadow: "0 4px 16px rgba(79, 142, 247, 0.3)",
            }}
          >
            {loading ? "Signing in..." : "Enter Examination Portal →"}
          </button>
        </form>
        <p style={{ margin: "20px 0 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>
          New here?{" "}
          <Link href="/register" style={{ color: "var(--color-accent-blue)", fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}