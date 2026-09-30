import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Manage exams, students, and access",
};

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠", id: "nav-admin-dashboard" },
  { href: "/admin/users", label: "Users", icon: "👥", id: "nav-admin-users" },
  { href: "/admin/tests", label: "Tests", icon: "📋", id: "nav-admin-tests" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝", id: "nav-admin-attempts" },
  { href: "/admin/reports", label: "Reports", icon: "📊", id: "nav-admin-reports" },
];

const STATS = [
  { label: "Total Students", value: "—", icon: "👥", color: "#4f8ef7" },
  { label: "Active Tests", value: "—", icon: "📋", color: "#10b981" },
  { label: "Attempts Today", value: "—", icon: "📝", color: "#8b5cf6" },
  { label: "Online Now", value: "—", icon: "🟢", color: "#f59e0b" },
];

export default function AdminDashboardPage() {
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
                color: item.href === "/admin/dashboard" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: item.href === "/admin/dashboard" ? "rgba(79,142,247,0.1)" : "transparent",
                fontSize: "0.9rem",
                fontWeight: item.href === "/admin/dashboard" ? 600 : 400,
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
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "6px" }}>
            Admin Dashboard
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Overview of the examination platform.
          </p>
        </div>

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
          🚧 <strong>Foundation:</strong> Dashboard analytics, live monitoring, and real data will be connected in Phases 4–11.
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="glass-card" style={{ padding: "24px" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {[
            { label: "View All Students", href: "/admin/users", icon: "👥", id: "quick-link-users" },
            { label: "Create New Test", href: "/admin/tests", icon: "➕", id: "quick-link-create-test" },
            { label: "Grant Test Access", href: "/admin/users", icon: "🔑", id: "quick-link-grant-access" },
            { label: "View Attempts", href: "/admin/attempts", icon: "📝", id: "quick-link-attempts" },
          ].map((action) => (
            <Link
              key={action.href + action.label}
              id={action.id}
              href={action.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                textDecoration: "none",
                color: "var(--color-text-primary)",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
