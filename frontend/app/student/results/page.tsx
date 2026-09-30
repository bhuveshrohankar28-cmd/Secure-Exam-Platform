import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Results" };

export default function StudentResultsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
        padding: "32px 16px",
      }}
    >
      <div className="container-app">
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" }}>My Results</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px" }}>
          View scores from completed exams.
        </p>

        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "12px",
            padding: "16px 20px",
            fontSize: "0.85rem",
            color: "#f59e0b",
            marginBottom: "32px",
          }}
        >
          🚧 <strong>Phase 9:</strong> Results with scores, correct answers review, and performance analytics.
        </div>

        <div
          className="glass-card"
          style={{
            padding: "60px",
            textAlign: "center",
            color: "var(--color-text-secondary)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📊</div>
          <p style={{ fontSize: "1rem" }}>No results yet. Complete an exam to see your scores here.</p>
        </div>
      </div>
    </main>
  );
}
