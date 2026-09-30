"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { healthApi } from "@/lib/api/endpoints";

type ConnectionStatus = "checking" | "connected" | "disconnected";

export default function HomePage() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [backendMessage, setBackendMessage] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    async function checkBackend() {
      const result = await healthApi.check();
      if (result.success && result.data) {
        const data = result.data as { message: string; timestamp: string };
        setStatus("connected");
        setBackendMessage(data.message);
        setTimestamp(data.timestamp);
      } else {
        setStatus("disconnected");
      }
    }
    checkBackend();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--gradient-hero)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background blobs */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-200px",
          right: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-200px",
          left: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px", position: "relative" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(79,142,247,0.1)",
            border: "1px solid rgba(79,142,247,0.2)",
            borderRadius: "999px",
            padding: "6px 16px",
            fontSize: "0.8rem",
            color: "#4f8ef7",
            marginBottom: "24px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span>🎓</span>
          <span>College Examination Platform</span>
        </div>

        <h1
          className="gradient-text"
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "16px",
            letterSpacing: "-0.02em",
          }}
        >
          Secure Exam Platform
        </h1>

        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            maxWidth: "480px",
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          A browser-based MCQ examination system with integrity monitoring,
          real-time access control, and detailed analytics.
        </p>
      </div>

      {/* Backend Status Card */}
      <div
        id="backend-status-card"
        className="glass-card"
        style={{
          padding: "24px 32px",
          marginBottom: "40px",
          minWidth: "min(360px, 100%)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Backend Connection
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            fontSize: "1.1rem",
            fontWeight: 600,
          }}
        >
          {status === "checking" && (
            <>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#f59e0b",
                  animation: "pulse 1s infinite",
                }}
              />
              <span style={{ color: "#f59e0b" }}>Checking…</span>
            </>
          )}
          {status === "connected" && (
            <>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              <span id="backend-status-text" style={{ color: "#10b981" }}>
                Backend Status: Connected ✓
              </span>
            </>
          )}
          {status === "disconnected" && (
            <>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              <span id="backend-status-text" style={{ color: "#ef4444" }}>
                Backend Status: Disconnected
              </span>
            </>
          )}
        </div>

        {backendMessage && (
          <p
            style={{
              marginTop: "8px",
              fontSize: "0.85rem",
              color: "var(--color-text-secondary)",
            }}
          >
            {backendMessage}
          </p>
        )}
        {timestamp && (
          <p style={{ marginTop: "4px", fontSize: "0.75rem", color: "var(--color-border)" }}>
            {new Date(timestamp).toLocaleString()}
          </p>
        )}
        {status === "disconnected" && (
          <p
            style={{
              marginTop: "10px",
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
            }}
          >
            Make sure the backend is running at{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "4px",
                padding: "1px 6px",
                fontFamily: "monospace",
              }}
            >
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}
            </code>
          </p>
        )}
      </div>

      {/* Navigation Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          width: "100%",
          maxWidth: "600px",
          marginBottom: "40px",
        }}
      >
        <Link
          id="nav-student-login"
          href="/login"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            padding: "24px",
            background: "rgba(79,142,247,0.07)",
            border: "1px solid rgba(79,142,247,0.2)",
            borderRadius: "16px",
            textDecoration: "none",
            color: "var(--color-text-primary)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(79,142,247,0.15)";
            e.currentTarget.style.borderColor = "rgba(79,142,247,0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(79,142,247,0.07)";
            e.currentTarget.style.borderColor = "rgba(79,142,247,0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span style={{ fontSize: "2rem" }}>📚</span>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Student Login</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Take exams &amp; view results
            </div>
          </div>
        </Link>

        <Link
          id="nav-admin-login"
          href="/login?role=admin"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            padding: "24px",
            background: "rgba(139,92,246,0.07)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "16px",
            textDecoration: "none",
            color: "var(--color-text-primary)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(139,92,246,0.15)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(139,92,246,0.07)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span style={{ fontSize: "2rem" }}>🛡️</span>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Admin Panel</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Manage tests &amp; students
            </div>
          </div>
        </Link>
      </div>

      {/* Feature Pills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
          maxWidth: "600px",
        }}
      >
        {[
          "🔐 Firebase Auth",
          "⚡ Real-time Heartbeat",
          "📋 Test Access Control",
          "🔍 Browser Monitoring",
          "📊 Analytics",
          "📱 Mobile-First",
        ].map((feature) => (
          <span
            key={feature}
            style={{
              padding: "6px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--color-border)",
              borderRadius: "999px",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
            }}
          >
            {feature}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  );
}
