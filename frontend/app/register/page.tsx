"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api/endpoints";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    rtfId: "",
    name: "",
    email: "",
    domain: "Software",
    branch: "Computer Engineering",
    yearOfPassing: 2027,
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.rtfId.trim() || !formData.name.trim()) {
      setError("Please provide both your RTF ID and Full Name.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authApi.register(formData);

      if (response.success) {
        setSuccessMessage(
          (response.data as any)?.message ||
            `Student registration complete! RTF ID "${formData.rtfId.toUpperCase()}" is now registered. Please wait for your exam administrator to allow your account before logging in.`
        );
      } else {
        setError(response.error || "Failed to register RTF ID.");
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
            Student Registration
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "6px", fontSize: "0.88rem" }}>
            Register your RTF ID for examination access
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
                RTF ID <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. RTF2024005"
                required
                value={formData.rtfId}
                onChange={(e) => setFormData({ ...formData, rtfId: e.target.value.toUpperCase() })}
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
                Full Student Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Yash Patel"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label
                  style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "5px" }}
                >
                  Domain
                </label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    background: "#1e2235",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                >
                  <option value="Software">Software</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                </select>
              </div>

              <div>
                <label
                  style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "5px" }}
                >
                  Passing Year
                </label>
                <input
                  type="number"
                  value={formData.yearOfPassing}
                  onChange={(e) => setFormData({ ...formData, yearOfPassing: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>
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
              {loading ? "Registering..." : "Submit RTF ID for Approval"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "22px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          Already registered?{" "}
          <Link href="/login" style={{ color: "#4f8ef7", textDecoration: "none", fontWeight: 600 }}>
            Sign In with RTF ID
          </Link>
        </p>
      </div>
    </main>
  );
}
