import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin — Test Access",
  description: "Manage test access permissions for students",
};

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠", id: "nav-admin-dashboard" },
  { href: "/admin/users", label: "Users", icon: "👥", id: "nav-admin-users" },
  { href: "/admin/tests", label: "Tests", icon: "📋", id: "nav-admin-tests" },
  { href: "/admin/access", label: "Test Access", icon: "🔑", id: "nav-admin-access" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝", id: "nav-admin-attempts" },
  { href: "/admin/reports", label: "Reports", icon: "📊", id: "nav-admin-reports" },
];

const MOCK_ACCESS_RULES = [
  {
    id: "acc_1",
    testTitle: "Mid-Term Software Engineering MCQ",
    accessType: "DOMAIN",
    target: "Domain: Software (All Years)",
    grantedBy: "Admin",
    status: "active",
    grantedAt: "2026-09-28",
  },
  {
    id: "acc_2",
    testTitle: "Data Structures & Algorithms Quiz",
    accessType: "YEAR",
    target: "Year 2 (2027 Batch)",
    grantedBy: "Admin",
    status: "active",
    grantedAt: "2026-09-29",
  },
  {
    id: "acc_3",
    testTitle: "Digital Logic Design Assessment",
    accessType: "STUDENT",
    target: "Arjun Sharma (CE2024001)",
    grantedBy: "Admin",
    status: "revoked",
    grantedAt: "2026-09-25",
  },
];

export default function AdminAccessPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          background: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-border)",
          padding: "24px 0",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>🛡️</div>
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Admin Panel</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            Exam Platform
          </div>
        </div>

        <nav style={{ padding: "12px 12px", flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color: item.href === "/admin/access" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: item.href === "/admin/access" ? "rgba(79,142,247,0.1)" : "transparent",
                fontSize: "0.9rem",
                fontWeight: item.href === "/admin/access" ? 600 : 400,
                marginBottom: "4px",
                transition: "all 0.2s",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          Admin User
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "6px" }}>
              Test Access Management
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              Grant or revoke examination access by domain, batch year, or individual student.
            </p>
          </div>
          <button
            id="grant-access-modal-btn"
            style={{
              padding: "10px 20px",
              background: "var(--color-accent)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            + Grant New Access
          </button>
        </div>

        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "12px",
            padding: "14px 20px",
            marginBottom: "28px",
            fontSize: "0.85rem",
            color: "#f59e0b",
          }}
        >
          🚧 <strong>Foundation Phase:</strong> Dynamic access validation rules and live Firestore binding will be implemented in Phase 6.
        </div>

        {/* Access List */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "12px 16px" }}>Examination</th>
                <th style={{ padding: "12px 16px" }}>Type</th>
                <th style={{ padding: "12px 16px" }}>Target</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Granted At</th>
                <th style={{ padding: "12px 16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ACCESS_RULES.map((rule) => (
                <tr key={rule.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{rule.testTitle}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        background: "rgba(79, 142, 247, 0.15)",
                        color: "#4f8ef7",
                        fontWeight: 600,
                      }}
                    >
                      {rule.accessType}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)" }}>{rule.target}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        background: rule.status === "active" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: rule.status === "active" ? "#10b981" : "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      {rule.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
                    {rule.grantedAt}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      style={{
                        padding: "6px 12px",
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        borderRadius: "6px",
                        color: "var(--color-text-secondary)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      {rule.status === "active" ? "Revoke" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
