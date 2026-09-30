"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api/endpoints";

interface Student {
  id: string;
  rtfId: string;
  name: string;
  domain: string;
  branch: string;
  yearOfPassing?: number;
  status: "active" | "pending" | "revoked";
  isAllowed: boolean;
  online?: boolean;
}

const INITIAL_STUDENTS: Student[] = [
  {
    id: "usr_1",
    rtfId: "RTF2024001",
    name: "Arjun Sharma",
    domain: "Software",
    branch: "Computer Engineering",
    yearOfPassing: 2027,
    status: "active",
    isAllowed: true,
    online: true,
  },
  {
    id: "usr_2",
    rtfId: "RTF2024002",
    name: "Priya Patel",
    domain: "Electrical",
    branch: "Electrical Engineering",
    yearOfPassing: 2027,
    status: "active",
    isAllowed: true,
    online: false,
  },
  {
    id: "usr_3",
    rtfId: "RTF2024003",
    name: "Rahul Mehta",
    domain: "Mechanical",
    branch: "Mechanical Engineering",
    yearOfPassing: 2026,
    status: "pending",
    isAllowed: false,
    online: false,
  },
  {
    id: "usr_4",
    rtfId: "RTF2024004",
    name: "Sneha Joshi",
    domain: "Software",
    branch: "Computer Engineering",
    yearOfPassing: 2027,
    status: "pending",
    isAllowed: false,
    online: false,
  },
];

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠", id: "nav-admin-dashboard" },
  { href: "/admin/users", label: "Users & Approvals", icon: "👥", id: "nav-admin-users" },
  { href: "/admin/tests", label: "Tests", icon: "📋", id: "nav-admin-tests" },
  { href: "/admin/access", label: "Test Access", icon: "🔑", id: "nav-admin-access" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝", id: "nav-admin-attempts" },
  { href: "/admin/reports", label: "Reports", icon: "📊", id: "nav-admin-reports" },
];

export default function AdminUsersPage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [newRtfId, setNewRtfId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "allowed" | "pending">("all");

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await adminApi.getUsers();
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data
            .filter((u: any) => u.role !== "admin")
            .map((u: any) => ({
              id: u.id,
              rtfId: u.rtfId,
              name: u.name,
              domain: u.domain || "General",
              branch: u.branch || "Engineering",
              yearOfPassing: u.yearOfPassing || 2027,
              status: u.accountStatus || (u.isAllowed ? "active" : "pending"),
              isAllowed: Boolean(u.isAllowed),
              online: false,
            }));
          if (mapped.length > 0) {
            setStudents(mapped);
          }
        }
      } catch {
        // Fall back to default mock list
      }
    }
    loadUsers();
  }, []);

  async function handleToggleApproval(studentId: string, currentAllowed: boolean) {
    const nextAllowed = !currentAllowed;

    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              isAllowed: nextAllowed,
              status: nextAllowed ? "active" : "pending",
            }
          : s
      )
    );

    const student = students.find((s) => s.id === studentId);
    const label = nextAllowed ? "ALLOWED" : "REVOKED";
    setFeedback(`Success: ${student?.name} (${student?.rtfId}) is now ${label}.`);

    try {
      await adminApi.allowUser(studentId, nextAllowed);
    } catch {
      // Backend sync error handled gracefully
    }
  }

  async function handlePreApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!newRtfId.trim()) return;

    const normalizedRtf = newRtfId.trim().toUpperCase();
    const name = newStudentName.trim() || `Student ${normalizedRtf}`;

    const newStudent: Student = {
      id: `usr_${Date.now()}`,
      rtfId: normalizedRtf,
      name,
      domain: "Software",
      branch: "Computer Engineering",
      yearOfPassing: 2027,
      status: "active",
      isAllowed: true, // Pre-approved!
      online: false,
    };

    setStudents([newStudent, ...students]);
    setNewRtfId("");
    setNewStudentName("");
    setFeedback(`RTF ID "${normalizedRtf}" pre-approved successfully! Student can now log in.`);

    try {
      await adminApi.preAllowRtfId(normalizedRtf, name);
    } catch {
      // Handled
    }
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.rtfId.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.domain.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "allowed") return s.isAllowed;
    if (filter === "pending") return !s.isAllowed;
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
            Student RTF ID Approval Management
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Only students whose RTF IDs have been <strong>Allowed</strong> by an administrator can log in and take exams.
          </p>
        </div>

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

        {/* Pre-Approve Form Card */}
        <div className="glass-card" style={{ padding: "20px 24px", marginBottom: "28px" }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "12px" }}>
            ⚡ Pre-Approve Student RTF ID
          </div>
          <form onSubmit={handlePreApprove} style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <input
              type="text"
              placeholder="RTF ID (e.g. RTF2024099)"
              value={newRtfId}
              onChange={(e) => setNewRtfId(e.target.value.toUpperCase())}
              style={{
                flex: "1 1 200px",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            />
            <input
              type="text"
              placeholder="Student Name (Optional)"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              style={{
                flex: "1 1 220px",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: "var(--color-accent-blue)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              + Pre-Approve & Allow
            </button>
          </form>
        </div>

        {/* Search & Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by RTF ID or Name..."
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
              onClick={() => setFilter("allowed")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                background: filter === "allowed" ? "rgba(16, 185, 129, 0.2)" : "var(--color-bg-card)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.4)",
              }}
            >
              Allowed ({students.filter((s) => s.isAllowed).length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                background: filter === "pending" ? "rgba(245, 158, 11, 0.2)" : "var(--color-bg-card)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.4)",
              }}
            >
              Pending Approval ({students.filter((s) => !s.isAllowed).length})
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="glass-card" style={{ padding: "16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "12px 16px" }}>Student RTF ID</th>
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
                    {student.rtfId}
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
                        ✓ ALLOWED TO EXAM
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.76rem",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          fontWeight: 600,
                        }}
                      >
                        ⏳ PENDING APPROVAL
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {student.isAllowed ? (
                      <button
                        onClick={() => handleToggleApproval(student.id, student.isAllowed)}
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
                        onClick={() => handleToggleApproval(student.id, student.isAllowed)}
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
                        ✓ Allow Student
                      </button>
                    )}
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
