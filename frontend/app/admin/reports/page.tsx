import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Reports" };

export default function AdminReportsPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside style={{ width: "240px", background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: "1.5rem" }}>🛡️</div>
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Admin Panel</div>
        </div>
        <nav style={{ padding: "12px" }}>
          {[{ href: "/admin/dashboard", label: "Dashboard", icon: "🏠" }, { href: "/admin/users", label: "Users", icon: "👥" }, { href: "/admin/tests", label: "Tests", icon: "📋" }, { href: "/admin/attempts", label: "Attempts", icon: "📝" }, { href: "/admin/reports", label: "Reports", icon: "📊", active: true }].map(item => (
            <a key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", textDecoration: "none", color: (item as { active?: boolean }).active ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: (item as { active?: boolean }).active ? "rgba(79,142,247,0.1)" : "transparent", fontSize: "0.9rem", marginBottom: "4px" }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "32px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" }}>Reports</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px", fontSize: "0.9rem" }}>Exam performance analytics and audit logs.</p>
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", padding: "14px 20px", marginBottom: "32px", fontSize: "0.85rem", color: "#f59e0b" }}>
          🚧 <strong>Phase 12:</strong> Analytics, violation reports, and audit logs.
        </div>
        <div className="glass-card" style={{ padding: "60px", textAlign: "center", color: "var(--color-text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📊</div>
          <p>Reports will appear here after exams are completed.</p>
        </div>
      </main>
    </div>
  );
}
