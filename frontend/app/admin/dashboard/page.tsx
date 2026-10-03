"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api/endpoints";
import { AttemptWithViolations, Test, User } from "@/types";

const navItems = [
  ["Dashboard", "/admin/dashboard"], ["Users", "/admin/users"], ["Tests", "/admin/tests"],
  ["Test Access", "/admin/access"], ["Attempts", "/admin/attempts"], ["Reports", "/admin/reports"],
];

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<AttemptWithViolations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.getUsers(), adminApi.getTests(), adminApi.getAttempts()])
      .then(([userResponse, testResponse, attemptResponse]) => {
        if (!active) return;
        const failures = [userResponse, testResponse, attemptResponse].filter((response) => !response.success);
        if (failures.length) setError(failures.map((response) => response.error).filter(Boolean).join(" "));
        if (Array.isArray(userResponse.data)) setUsers(userResponse.data);
        if (Array.isArray(testResponse.data)) setTests(testResponse.data);
        if (Array.isArray(attemptResponse.data)) setAttempts(attemptResponse.data);
        setLoading(false);
      }).catch((loadError: unknown) => {
        console.error("[AdminDashboard] Failed to load metrics:", loadError);
        if (active) {
          setError("Could not load dashboard metrics.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  const today = new Date().toDateString();
  const stats = [
    { label: "Students", value: users.filter((user) => user.role === "student").length, icon: "👥", color: "#4f8ef7" },
    { label: "Active tests", value: tests.filter((test) => test.status === "active").length, icon: "📋", color: "#10b981" },
    { label: "Attempts today", value: attempts.filter((attempt) => new Date(attempt.startedAt).toDateString() === today).length, icon: "📝", color: "#8b5cf6" },
    { label: "In progress", value: attempts.filter((attempt) => attempt.status === "in_progress").length, icon: "⏱️", color: "#f59e0b" },
    { label: "Total violations", value: attempts.reduce((sum, a) => sum + (a.violationCount ?? 0), 0), icon: "⚠️", color: "#f59e0b" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside style={{ width: "220px", background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 12px" }}>
        <strong style={{ display: "block", padding: "0 8px 20px" }}>Admin Panel</strong>
        <nav style={{ display: "grid", gap: "4px" }}>{navItems.map(([label, href]) => <Link key={href} href={href} style={{ padding: "10px", borderRadius: "8px", textDecoration: "none", color: href === "/admin/dashboard" ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: href === "/admin/dashboard" ? "rgba(79,142,247,.1)" : "transparent" }}>{label}</Link>)}</nav>
      </aside>
      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Admin Dashboard</h1>
        <p style={{ color: "var(--color-text-secondary)", margin: "6px 0 24px" }}>Live overview of exams, students, and submissions.</p>
        {error && <div role="alert" style={{ color: "#f87171", marginBottom: "18px" }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "30px" }}>
          {stats.map((stat) => <div key={stat.label} className="glass-card" style={{ padding: "22px" }}><div style={{ fontSize: "1.4rem" }}>{stat.icon}</div><div style={{ fontSize: "1.9rem", fontWeight: 800, color: stat.color, marginTop: "8px" }}>{loading ? "…" : stat.value}</div><div style={{ color: "var(--color-text-secondary)", fontSize: ".84rem" }}>{stat.label}</div></div>)}
        </div>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "12px" }}>Quick actions</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {[["Create / manage tests", "/admin/tests"], ["Manage students", "/admin/users"], ["Grant test access", "/admin/access"], ["Review attempts", "/admin/attempts"], ["View reports", "/admin/reports"]].map(([label, href]) => <Link key={href} href={href} className="glass-card" style={{ padding: "14px 18px", textDecoration: "none", color: "var(--color-text-primary)" }}>{label} →</Link>)}
          {!loading && tests.filter((test) => test.status === "active").map((test) => <Link key={test.id} href={`/admin/monitor/${test.id}`} className="glass-card" style={{ padding: "14px 18px", textDecoration: "none", color: "var(--color-text-primary)" }}>Monitor: {test.title} →</Link>)}
        </div>
        <section style={{ marginTop: "30px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "12px" }}>Recent attempts</h2>
          {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p> : attempts.length === 0 ? <p style={{ color: "var(--color-text-secondary)" }}>No exam attempts recorded yet.</p> : <div className="glass-card" style={{ padding: "12px" }}>{attempts.slice(0, 5).map((attempt) => <div key={attempt.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px", borderBottom: "1px solid var(--color-border)" }}><span>{attempt.userName || "Student"} · {attempt.testTitle}</span><span style={{ color: "var(--color-text-secondary)" }}>{attempt.status.replace("_", " ")}</span></div>)}</div>}
        </section>
      </main>
    </div>
  );
}
