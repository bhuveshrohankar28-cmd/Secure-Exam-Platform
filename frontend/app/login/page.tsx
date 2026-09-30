"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [rtfId, setRtfId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!rtfId.trim()) {
      setError("Please enter your RTF ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsPendingApproval(false);

    try {
      const response = await authApi.login(rtfId.trim());

      if (response.success && response.data?.token) {
        setAuthToken(response.data.token);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        const role = response.data.user?.role;
        if (role === "admin" || role === "superadmin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      } else {
        // Check if denied due to pending admin approval
        const resWithPending = response as { isPending?: boolean; error?: string };
        if (resWithPending.isPending || response.error?.includes("not been approved")) {
          setIsPendingApproval(true);
        }
        setError(response.error || "Login failed. Please check your RTF ID.");
      }
    } catch {
      setError("Unable to connect to the backend server. Is it running on port 5000?");
    } finally {
      setLoading(false);
    }
  }

  function fillSample(id: string) {
    setRtfId(id);
    setError(null);
    setIsPendingApproval(false);
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
            Enter your unique <strong>RTF ID</strong> to access your tests
          </p>
        </div>

        {/* Pending Approval Notice */}
        {isPendingApproval && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              color: "#fbbf24",
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "4px" }}>
              ⏳ Awaiting Administrator Approval
            </div>
            Your RTF ID is registered, but an administrator has not yet allowed your account for this examination session.
            Please inform your examiner or check back once permitted.
          </div>
        )}

        {/* Error message */}
        {error && !isPendingApproval && (
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
            <label
              htmlFor="login-rtf"
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Student / Admin RTF ID
            </label>
            <input
              id="login-rtf"
              type="text"
              placeholder="e.g. RTF2024001 or ADMIN001"
              value={rtfId}
              onChange={(e) => setRtfId(e.target.value.toUpperCase())}
              disabled={loading}
              autoFocus
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                color: "var(--color-text-primary)",
                fontSize: "1.05rem",
                letterSpacing: "0.04em",
                fontFamily: "monospace",
                fontWeight: 600,
                outline: "none",
              }}
            />
          </div>

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
            {loading ? "Verifying RTF ID..." : "Enter Examination Portal →"}
          </button>
        </form>

        {/* Quick Testing helper */}
        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            ⚡ <strong>Test IDs (Click to prefill):</strong>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              onClick={() => fillSample("RTF2024001")}
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              RTF2024001 (Allowed)
            </button>
            <button
              type="button"
              onClick={() => fillSample("RTF2024003")}
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#f59e0b",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              RTF2024003 (Pending)
            </button>
            <button
              type="button"
              onClick={() => fillSample("ADMIN001")}
              style={{
                background: "rgba(79, 142, 247, 0.12)",
                border: "1px solid rgba(79, 142, 247, 0.3)",
                color: "#4f8ef7",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              ADMIN001 (Admin)
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "22px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          New student?{" "}
          <Link href="/register" style={{ color: "#4f8ef7", textDecoration: "none", fontWeight: 600 }}>
            Register your RTF ID
          </Link>
        </p>
      </div>
    </main>
  );
}
