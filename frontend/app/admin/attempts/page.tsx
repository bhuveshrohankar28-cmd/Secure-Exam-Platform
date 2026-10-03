"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, AttemptView } from "@/lib/api/endpoints";

const navItems = [
  ["Dashboard", "/admin/dashboard"], ["Users", "/admin/users"], ["Tests", "/admin/tests"],
  ["Test Access", "/admin/access"], ["Attempts", "/admin/attempts"], ["Reports", "/admin/reports"],
];

export default function AdminAttemptsPage() {
  const [attempts, setAttempts] = useState<AttemptView[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAttempts = useCallback(async () => {
    const response = await adminApi.getAttempts(statusFilter ? { status: statusFilter } : undefined);
    if (response.success && Array.isArray(response.data)) {
      setAttempts(response.data);
      setError(null);
    } else setError(response.error || "Could not load attempts.");
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    let active = true;
    adminApi.getAttempts(statusFilter ? { status: statusFilter } : undefined).then((response) => {
      if (!active) return;
      if (response.success && Array.isArray(response.data)) {
        setAttempts(response.data);
        setError(null);
      } else setError(response.error || "Could not load attempts.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [statusFilter]);

  async function resetAttempt(attempt: AttemptView) {
    if (!window.confirm(`Reset ${attempt.userName || "this student's"} attempt for "${attempt.testTitle}"?`)) return;
    setBusyId(attempt.id);
    const response = await adminApi.resetAttempt(attempt.id);
    if (response.success) await loadAttempts();
    else setError(response.error || "Could not reset this attempt.");
    setBusyId(null);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside style={{ width: "220px", background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 12px" }}>
        <strong style={{ display: "block", padding: "0 8px 20px" }}>Admin Panel</strong>
        <nav style={{ display: "grid", gap: "4px" }}>{navItems.map(([label, href]) => <Link key={href} href={href} style={{ padding: "10px", borderRadius: "8px", textDecoration: "none", color: href === "/admin/attempts" ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: href === "/admin/attempts" ? "rgba(79,142,247,.1)" : "transparent" }}>{label}</Link>)}</nav>
      </aside>
      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Exam Attempts</h1>
        <p style={{ margin: "6px 0 20px", color: "var(--color-text-secondary)" }}>Review submissions and allow a student to retake a test by resetting their attempt.</p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <select aria-label="Filter attempts by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>
            <option value="">All statuses</option><option value="in_progress">In progress</option><option value="submitted">Submitted</option><option value="graded">Graded</option><option value="force_submitted">Force submitted</option>
          </select>
          <button onClick={() => void loadAttempts()} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", background: "transparent", cursor: "pointer" }}>Refresh</button>
        </div>
        {error && <div role="alert" style={{ color: "#f87171", marginBottom: "16px" }}>{error}</div>}
        {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading attempts…</p> : attempts.length === 0 ? <div className="glass-card" style={{ padding: "26px", color: "var(--color-text-secondary)" }}>No attempts match this filter.</div> : (
          <div className="glass-card" style={{ padding: "12px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px", textAlign: "left" }}>
              <thead><tr style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{["Student", "Test", "Status", "Score", "Started", "Actions"].map((title) => <th key={title} style={{ padding: "12px" }}>{title}</th>)}</tr></thead>
              <tbody>{attempts.map((attempt) => <tr key={attempt.id} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <td style={{ padding: "12px" }}>{attempt.userName || "Student"}</td>
                <td style={{ padding: "12px" }}>{attempt.testTitle}</td>
                <td style={{ padding: "12px" }}>{attempt.status.replace("_", " ")}</td>
                <td style={{ padding: "12px" }}>{attempt.score === null ? "—" : `${attempt.score} / ${attempt.totalMarks ?? 0}`}</td>
                <td style={{ padding: "12px" }}>{new Date(attempt.startedAt).toLocaleString()}</td>
                <td style={{ padding: "12px" }}><button disabled={busyId === attempt.id} onClick={() => void resetAttempt(attempt)} style={{ padding: "7px 10px", border: "1px solid var(--color-border)", borderRadius: "7px", color: "var(--color-text-primary)", background: "transparent", cursor: busyId === attempt.id ? "wait" : "pointer" }}>{busyId === attempt.id ? "Resetting…" : "Reset"}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
