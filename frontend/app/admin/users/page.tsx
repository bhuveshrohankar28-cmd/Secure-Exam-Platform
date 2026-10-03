"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api/endpoints";
import { User } from "@/types";

interface Student {
  id: string;
  username: string;
  name: string;
  domain: string;
  branch: string;
  yearOfPassing?: number;
  isAllowed: boolean;
  online?: boolean;
}

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠", id: "nav-admin-dashboard" },
  { href: "/admin/users", label: "Users", icon: "👥", id: "nav-admin-users" },
  { href: "/admin/tests", label: "Tests", icon: "📋", id: "nav-admin-tests" },
  { href: "/admin/access", label: "Test Access", icon: "🔑", id: "nav-admin-access" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝", id: "nav-admin-attempts" },
  { href: "/admin/reports", label: "Reports", icon: "📊", id: "nav-admin-reports" },
];

export default function AdminUsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");

  useEffect(() => {
    async function loadUsers() {
      const res = await adminApi.getUsers();
      if (res.success && Array.isArray(res.data)) {
        const mapped = (res.data as User[])
          .filter((u) => u.role === "student")
          .map((u) => ({
            id: u.id,
            username: u.username,
            name: u.name,
            domain: u.domain || "General",
            branch: u.branch || "Engineering",
            yearOfPassing: u.yearOfPassing,
            isAllowed: Boolean(u.isAllowed),
            online: u.lastSeen ? Date.now() - new Date(u.lastSeen).getTime() < 5 * 60_000 : false,
          }));
        setStudents(mapped);
      } else {
        setError(res.error || "Could not load users.");
      }
      setLoading(false);
    }
    loadUsers();
  }, []);

  async function handleToggleAccess(studentId: string, currentAllowed: boolean) {
    const nextAllowed = !currentAllowed;
    setBusyId(studentId);
    setError(null);
    const student = students.find((s) => s.id === studentId);
    const response = await adminApi.allowUser(studentId, nextAllowed);
    if (response.success) {
      setStudents((prev) => prev.map((s) => s.id === studentId ? { ...s, isAllowed: nextAllowed } : s));
      setFeedback(`${student?.name}'s account access is now ${nextAllowed ? "enabled" : "disabled"}.`);
    } else {
      setError(response.error || "Could not update account access.");
    }
    setBusyId(null);
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.domain.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "enabled") return s.isAllowed;
    if (filter === "disabled") return !s.isAllowed;
    return true;
  });

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
            Exam Management
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
                color: item.href === "/admin/users" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                background: item.href === "/admin/users" ? "rgba(79,142,247,0.1)" : "transparent",
                fontSize: "0.9rem",
                fontWeight: item.href === "/admin/users" ? 600 : 400,
                marginBottom: "4px",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px", overflow: "auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, marginBottom: "6px" }}>
            User Account Management
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Administrators can manage student accounts and grant access to assigned tests.
          </p>
        </div>
        {error && <div role="alert" style={{ color: "#f87171", marginBottom: "16px" }}>{error}</div>}

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "24px",
              color: "#34d399",
              fontSize: "0.88rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{feedback}</span>
            <button
              onClick={() => setFeedback(null)}
              style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by username or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 240px",
              padding: "10px 16px",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.88rem",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setFilter("all")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                background: filter === "all" ? "var(--color-accent-blue)" : "var(--color-bg-card)",
                color: "#fff",
                border: "1px solid var(--color-border)",
              }}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilter("enabled")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                background: filter === "enabled" ? "rgba(16, 185, 129, 0.2)" : "var(--color-bg-card)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.4)",
              }}
            >
              Enabled ({students.filter((s) => s.isAllowed).length})
            </button>
            <button
              onClick={() => setFilter("disabled")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                background: filter === "disabled" ? "rgba(239, 68, 68, 0.15)" : "var(--color-bg-card)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.35)",
              }}
            >
              Disabled ({students.filter((s) => !s.isAllowed).length})
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="glass-card" style={{ padding: "16px", overflowX: "auto" }}>
          {loading ? <p style={{ padding: "20px", color: "var(--color-text-secondary)" }}>Loading users…</p> : students.length === 0 ? <p style={{ padding: "20px", color: "var(--color-text-secondary)" }}>No student accounts found.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "12px 16px" }}>Username</th>
                <th style={{ padding: "12px 16px" }}>Full Name</th>
                <th style={{ padding: "12px 16px" }}>Domain</th>
                <th style={{ padding: "12px 16px" }}>Exam Access Status</th>
                <th style={{ padding: "12px 16px" }}>Admin Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="table-row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, fontFamily: "monospace", fontSize: "0.95rem", color: "#4f8ef7" }}>
                    {student.username}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{student.name}</td>
                  <td style={{ padding: "14px 16px", color: "var(--color-text-secondary)" }}>{student.domain}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {student.isAllowed ? (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.76rem",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          fontWeight: 600,
                        }}
                      >
                        ✓ ACCESS ENABLED
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.76rem",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          fontWeight: 600,
                        }}
                      >
                        ACCESS DISABLED
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {student.isAllowed ? (
                      <button
                        disabled={busyId === student.id}
                        onClick={() => handleToggleAccess(student.id, student.isAllowed)}
                        style={{
                          padding: "6px 14px",
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          color: "#ef4444",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <button
                        disabled={busyId === student.id}
                        onClick={() => handleToggleAccess(student.id, student.isAllowed)}
                        style={{
                          padding: "6px 14px",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          borderRadius: "6px",
                          color: "#10b981",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Enable Account
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </main>
    </div>
  );
}
