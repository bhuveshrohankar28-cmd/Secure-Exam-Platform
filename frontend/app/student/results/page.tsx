"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { attemptsApi, AttemptView } from "@/lib/api/endpoints";

export default function StudentResultsPage() {
  const [attempts, setAttempts] = useState<AttemptView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    attemptsApi.mine().then((response) => {
      if (!active) return;
      if (response.success && Array.isArray(response.data)) {
        setAttempts(response.data.filter((attempt) => attempt.status !== "in_progress"));
      } else {
        setError(response.error || "Could not load your results.");
      }
      setLoading(false);
    }).catch((loadError: unknown) => {
      console.error("[StudentResults] Failed to load results:", loadError);
      if (active) {
        setError("Could not load your results. Please try again.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-primary)", padding: "32px 16px" }}>
      <div className="container-app">
        <Link href="/student/dashboard" style={{ color: "#4f8ef7", textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "18px", marginBottom: "8px" }}>My Results</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px" }}>Scores from your submitted exams.</p>
        {error && <div role="alert" style={{ color: "#f87171", marginBottom: "18px" }}>{error}</div>}
        {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading results…</p> : attempts.length === 0 ? (
          <div className="glass-card" style={{ padding: "36px", textAlign: "center", color: "var(--color-text-secondary)" }}>No submitted results yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {attempts.map((attempt) => (
              <article key={attempt.id} className="glass-card" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{attempt.testTitle}</h2>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: ".85rem", marginTop: "6px" }}>Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—"} · {attempt.status}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "1.3rem", color: "#4f8ef7" }}>{attempt.score ?? 0} / {attempt.totalMarks ?? 0}</strong>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: ".8rem", marginTop: "4px" }}>{attempt.correctCount ?? 0} correct · {attempt.answeredCount ?? 0} answered</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
