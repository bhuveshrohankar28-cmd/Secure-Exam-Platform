import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "Your exam dashboard",
};

const MOCK_TESTS = [
  { id: "1", title: "Data Structures & Algorithms", duration: 60, totalMarks: 100, status: "active" },
  { id: "2", title: "Operating Systems", duration: 45, totalMarks: 75, status: "scheduled" },
];

export default function StudentDashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
        padding: "0",
      }}
    >
      {/* Top Nav */}
      <nav
        style={{
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem" }}>📚</span>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Student Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="badge badge-green">● Online</span>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            S
          </div>
        </div>
      </nav>

      <div className="container-app" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
        {/* Phase Notice */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "12px",
            padding: "14px 20px",
            marginBottom: "32px",
            fontSize: "0.85rem",
            color: "#f59e0b",
          }}
        >
          🚧 <strong>Foundation:</strong> This is a UI placeholder. Full dashboard coming in Phase 3–7.
          Heartbeat, test list, and exam engine will be connected to the backend.
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {[
            { label: "Available Tests", value: "2", icon: "📋", color: "#4f8ef7" },
            { label: "Completed", value: "0", icon: "✅", color: "#10b981" },
            { label: "Pending Results", value: "0", icon: "⏳", color: "#f59e0b" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card"
              style={{ padding: "20px", textAlign: "center" }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Available Tests */}
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
          Available Tests
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {MOCK_TESTS.map((test) => (
            <div key={test.id} className="glass-card" style={{ padding: "20px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>
                    {test.title}
                  </div>
                  <div style={{ display: "flex", gap: "12px", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                    <span>⏱ {test.duration} min</span>
                    <span>📊 {test.totalMarks} marks</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className={`badge ${test.status === "active" ? "badge-green" : "badge-yellow"}`}>
                    {test.status}
                  </span>
                  <Link
                    href={`/student/tests/${test.id}`}
                    id={`start-test-${test.id}`}
                    style={{
                      padding: "8px 18px",
                      background: "var(--gradient-primary)",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    {test.status === "active" ? "Start Test" : "View"}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
