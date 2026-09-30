import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Users",
  description: "Manage student accounts and test access",
};

const MOCK_STUDENTS = [
  {
    id: "1",
    name: "Arjun Sharma",
    enrollmentNo: "CE2024001",
    domain: "Software",
    branch: "Computer Engineering",
    year: 2027,
    status: "active",
    online: true,
  },
  {
    id: "2",
    name: "Priya Patel",
    enrollmentNo: "EE2024002",
    domain: "Electrical",
    branch: "Electrical Engineering",
    year: 2027,
    status: "active",
    online: false,
  },
  {
    id: "3",
    name: "Rahul Mehta",
    enrollmentNo: "ME2024003",
    domain: "Mechanical",
    branch: "Mechanical Engineering",
    year: 2026,
    status: "pending",
    online: false,
  },
  {
    id: "4",
    name: "Sneha Joshi",
    enrollmentNo: "CE2024004",
    domain: "Software",
    branch: "Computer Engineering",
    year: 2027,
    status: "active",
    online: true,
  },
];

export default function AdminUsersPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      {/* Sidebar — same as dashboard */}
      <aside
        style={{
          width: "240px",
          background: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-border)",
          padding: "24px 0",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>🛡️</div>
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Admin Panel</div>
        </div>
        <nav style={{ padding: "12px 12px" }}>
          {[
            { href: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
            { href: "/admin/users", label: "Users", icon: "👥", active: true },
            { href: "/admin/tests", label: "Tests", icon: "📋" },
            { href: "/admin/attempts", label: "Attempts", icon: "📝" },
            { href: "/admin/reports", label: "Reports", icon: "📊" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color: item.active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: item.active ? "rgba(79,142,247,0.1)" : "transparent",
                fontSize: "0.9rem",
                fontWeight: item.active ? 600 : 400,
                marginBottom: "4px",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px", overflow: "auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "6px" }}>Users</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Manage student accounts and grant test access.
          </p>
        </div>

        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "12px",
            padding: "12px 20px",
            marginBottom: "24px",
            fontSize: "0.82rem",
            color: "#f59e0b",
          }}
        >
          🚧 <strong>Phase 4:</strong> Real data, live online/offline tracking, and filtering will be connected here.
          Below is a UI mockup of the final design.
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: "20px 24px", marginBottom: "20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto auto auto",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              id="users-search"
              placeholder="🔍 Search by name, email, or enrollment no."
              disabled
              style={{
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text-primary)",
                fontSize: "0.9rem",
                outline: "none",
                width: "100%",
              }}
            />
            {["Year", "Domain", "Branch", "Status", "Online"].map((filter) => (
              <select
                key={filter}
                id={`users-filter-${filter.toLowerCase()}`}
                disabled
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.85rem",
                  outline: "none",
                  cursor: "not-allowed",
                  minWidth: "100px",
                }}
              >
                <option>{filter}: All</option>
              </select>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Name", "Enrollment No.", "Domain", "Branch", "Year", "Status", "Online", "Actions"].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: "14px 20px",
                          textAlign: "left",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--color-text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                          background: "var(--color-bg-secondary)",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {MOCK_STUDENTS.map((student, i) => (
                  <tr
                    key={student.id}
                    id={`student-row-${student.id}`}
                    className="table-row-hover"
                    style={{
                      borderBottom: i < MOCK_STUDENTS.length - 1 ? "1px solid rgba(45,50,72,0.5)" : "none",
                    }}
                  >
                    <td style={{ padding: "14px 20px", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {student.name}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "0.85rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                      {student.enrollmentNo}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                      {student.domain}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "0.82rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {student.branch}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "0.85rem" }}>
                      {student.year}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span className={`badge ${student.status === "active" ? "badge-green" : "badge-yellow"}`}>
                        {student.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span className={`badge ${student.online ? "badge-green" : "badge-red"}`}>
                        {student.online ? "● ONLINE" : "○ OFFLINE"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          id={`grant-access-${student.id}`}
                          disabled
                          style={{
                            padding: "6px 12px",
                            background: "rgba(79,142,247,0.1)",
                            border: "1px solid rgba(79,142,247,0.3)",
                            borderRadius: "6px",
                            color: "#4f8ef7",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "not-allowed",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Grant Access
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: "16px", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
          Showing {MOCK_STUDENTS.length} of {MOCK_STUDENTS.length} students (mock data)
        </div>
      </main>
    </div>
  );
}
