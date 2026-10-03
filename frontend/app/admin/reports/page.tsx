"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminApi, AttemptView } from "@/lib/api/endpoints";

const navItems = [
  ["Dashboard", "/admin/dashboard"], ["Users", "/admin/users"], ["Tests", "/admin/tests"],
  ["Test Access", "/admin/access"], ["Attempts", "/admin/attempts"], ["Reports", "/admin/reports"],
];

function csvCell(value: string | number | null): string {
  const escaped = String(value ?? "").replaceAll('"', '""');
  return `"${escaped}"`;
}

export default function AdminReportsPage() {
  const [attempts, setAttempts] = useState<AttemptView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi.getAttempts().then((response) => {
      if (!active) return;
      if (response.success && Array.isArray(response.data)) setAttempts(response.data);
      else setError(response.error || "Could not load report data.");
      setLoading(false);
    }).catch((loadError: unknown) => {
      console.error("[AdminReports] Failed to load report data:", loadError);
      if (active) {
        setError("Could not load report data.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const completed = useMemo(() => attempts.filter((attempt) => attempt.score !== null), [attempts]);
  const average = completed.length
    ? Math.round(completed.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / completed.length * 100) / 100
    : 0;

  function downloadCsv() {
    const rows = [
      ["Student", "Test", "Status", "Score", "Total marks", "Correct", "Answered", "Started at", "Submitted at"],
      ...attempts.map((attempt) => [
        attempt.userName || "",
        attempt.testTitle,
        attempt.status,
        attempt.score,
        attempt.totalMarks,
        attempt.correctCount,
        attempt.answeredCount,
        attempt.startedAt,
        attempt.submittedAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "exam-attempts.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside style={{ width: "220px", background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 12px" }}>
        <strong style={{ display: "block", padding: "0 8px 20px" }}>Admin Panel</strong>
        <nav style={{ display: "grid", gap: "4px" }}>{navItems.map(([label, href]) => <Link key={href} href={href} style={{ padding: "10px", borderRadius: "8px", textDecoration: "none", color: href === "/admin/reports" ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: href === "/admin/reports" ? "rgba(79,142,247,.1)" : "transparent" }}>{label}</Link>)}</nav>
      </aside>
      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <div><h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Reports</h1><p style={{ color: "var(--color-text-secondary)", marginTop: "6px" }}>Exam performance and submission summaries.</p></div>
          <button onClick={downloadCsv} disabled={loading || attempts.length === 0} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-text-primary)", background: "var(--color-bg-card)", cursor: attempts.length ? "pointer" : "not-allowed" }}>Download CSV</button>
        </div>
        {error && <div role="alert" style={{ color: "#f87171", margin: "16px 0" }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "14px", margin: "24px 0" }}>
          {[["Total attempts", attempts.length], ["Submitted / graded", completed.length], ["In progress", attempts.filter((attempt) => attempt.status === "in_progress").length], ["Average score", completed.length ? average : "—"]].map(([label, value]) => <div className="glass-card" key={label} style={{ padding: "20px" }}><div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#4f8ef7" }}>{loading ? "…" : value}</div><div style={{ color: "var(--color-text-secondary)", fontSize: ".84rem" }}>{label}</div></div>)}
        </div>
        {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading report data…</p> : attempts.length === 0 ? <div className="glass-card" style={{ padding: "24px", color: "var(--color-text-secondary)" }}>No attempt data is available yet.</div> : (
          <div className="glass-card" style={{ padding: "12px", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse", textAlign: "left" }}>
              <thead><tr style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{["Student", "Test", "Status", "Score", "Correct / answered", "Submitted"].map((item) => <th key={item} style={{ padding: "12px" }}>{item}</th>)}</tr></thead>
              <tbody>{attempts.map((attempt) => <tr key={attempt.id} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}><td style={{ padding: "12px" }}>{attempt.userName || "Student"}</td><td style={{ padding: "12px" }}>{attempt.testTitle}</td><td style={{ padding: "12px" }}>{attempt.status.replace("_", " ")}</td><td style={{ padding: "12px" }}>{attempt.score === null ? "—" : `${attempt.score} / ${attempt.totalMarks ?? 0}`}</td><td style={{ padding: "12px" }}>{attempt.correctCount ?? "—"} / {attempt.answeredCount ?? "—"}</td><td style={{ padding: "12px" }}>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <p style={{ color: "var(--color-text-secondary)", fontSize: ".82rem", marginTop: "14px" }}>Reports include the attempt data currently exposed by the backend. Violation and audit-log reporting require corresponding backend event endpoints.</p>
      </main>
    </div>
  );
}
