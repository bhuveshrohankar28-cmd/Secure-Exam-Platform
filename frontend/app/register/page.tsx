"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setError("Please provide both your username and full name.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authApi.login(username.trim(), undefined, name.trim());

      if (response.success && response.data?.token) {
        setAuthToken(response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        router.push("/student/dashboard");
      } else {
        setError(response.error || "Could not create your account.");
      }
    } catch {
      setError("Could not reach backend server at http://localhost:5000.");
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
      <div className="glass-card" style={{ padding: "36px 30px", width: "100%", maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div style={{ fontSize: "2.6rem", marginBottom: "6px" }}>📝</div>
          <h1 className="gradient-text" style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            Create an Account
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "6px", fontSize: "0.88rem" }}>
            Join the examination platform
          </p>
        </div>

        {successMessage ? (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "12px",
              padding: "20px",
              color: "#34d399",
              lineHeight: 1.5,
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "6px", color: "#10b981" }}>
              Registration Submitted!
            </div>
            {successMessage}
            <div style={{ marginTop: "18px" }}>
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  padding: "10px 24px",
                  background: "var(--color-accent-green)",
                  color: "#fff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Go to Login Page →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "#f87171",
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "5px" }}
              >
                Username <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Choose a username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.95rem",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "5px" }}
              >
                Full Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Yash Patel"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                background: "var(--gradient-primary)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: loading ? "wait" : "pointer",
                marginTop: "8px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "22px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/" style={{ color: "#4f8ef7", textDecoration: "none", fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
