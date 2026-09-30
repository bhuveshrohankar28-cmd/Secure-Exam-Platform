import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to the Secure Exam Platform",
};

export default function LoginPage() {
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
      <div className="glass-card" style={{ padding: "40px 32px", width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "2.5rem" }}>🔐</span>
          <h1
            className="gradient-text"
            style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "12px" }}
          >
            Sign In
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "8px", fontSize: "0.9rem" }}>
            Secure Exam Platform
          </p>
        </div>

        {/* Placeholder form — full implementation in Phase 2 */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            fontSize: "0.85rem",
            color: "#f59e0b",
          }}
        >
          🚧 <strong>Phase 2:</strong> Authentication UI will be implemented here.
          This includes Firebase email/password login.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label
              htmlFor="login-email"
              style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "6px" }}
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@college.edu"
              disabled
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                color: "var(--color-text-primary)",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "6px" }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              disabled
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                color: "var(--color-text-primary)",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>
          <button
            id="login-submit"
            disabled
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--gradient-primary)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "not-allowed",
              opacity: 0.5,
              marginTop: "8px",
            }}
          >
            Sign In
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={{ color: "#4f8ef7", textDecoration: "none", fontWeight: 600 }}>
            Register
          </a>
        </p>
      </div>
    </main>
  );
}
