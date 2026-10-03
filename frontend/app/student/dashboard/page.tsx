"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { attemptsApi, AttemptView, authApi, testsApi, usersApi } from "@/lib/api/endpoints";
import { removeAuthToken } from "@/lib/api/client";
import { Test } from "@/types";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState<AttemptView[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [name, setName] = useState("Student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([attemptsApi.mine(), usersApi.heartbeat(), testsApi.getAll(), usersApi.me()]).then(([result, heartbeat, testResult, profile]) => {
      if (!active) return;
      if (profile.success && profile.data?.name) setName(profile.data.name);
      if (result.success && Array.isArray(result.data)) setAttempts(result.data);
      else setError(result.error || "Could not load your attempts.");
      if (testResult.success && Array.isArray(testResult.data)) setTests(testResult.data);
      else setError(testResult.error || "Could not load assigned tests.");
      if (!heartbeat.success && heartbeat.error) setError(heartbeat.error);
      setLoading(false);
    }).catch((loadError: unknown) => {
      console.error("[StudentDashboard] Failed to load dashboard:", loadError);
      if (active) {
        setError("Could not load your dashboard. Please try again.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  function joinTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Enter the test code from your examiner.");
      return;
    }
    router.push(`/student/tests/${encodeURIComponent(normalized)}`);
  }

  async function logout() {
    const response = await authApi.logout();
    if (!response.success) setError(response.error || "Could not sign out.");
    removeAuthToken();
    localStorage.removeItem("user");
    router.replace("/login");
  }

  const completedCount = attempts.filter((attempt) => attempt.status !== "in_progress").length;
  const activeAttempt = attempts.find((attempt) => attempt.status === "in_progress");

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <nav style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem" }}>📚</span>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Student Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Welcome, {name}</span>
          <Link href="/student/results" style={{ color: "#4f8ef7", textDecoration: "none" }}>My results</Link>
          <button onClick={logout} style={{ background: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" }}>Sign out</button>
        </div>
      </nav>

      <div className="container-app" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
        {error && <div role="alert" style={{ padding: "12px 16px", marginBottom: "18px", borderRadius: "10px", background: "rgba(239,68,68,.12)", color: "#f87171" }}>{error}</div>}
        <section className="glass-card" style={{ padding: "26px", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "8px" }}>Join an examination</h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "18px" }}>Enter the test code provided by your examiner.</p>
          <form onSubmit={joinTest} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input aria-label="Test code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. EXAM2026" autoCapitalize="characters" style={{ flex: "1 1 220px", padding: "12px 14px", border: "1px solid var(--color-border)", borderRadius: "8px", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
            <button type="submit" style={{ padding: "12px 20px", border: 0, borderRadius: "8px", color: "#fff", background: "var(--gradient-primary)", fontWeight: 700, cursor: "pointer" }}>Continue</button>
          </form>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "28px" }}>
          {[{ label: "Total attempts", value: attempts.length }, { label: "Completed", value: completedCount }, { label: "In progress", value: activeAttempt ? 1 : 0 }].map((stat) => (
            <div className="glass-card" key={stat.label} style={{ padding: "20px" }}>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#4f8ef7" }}>{stat.value}</div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: ".85rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "14px" }}>Assigned tests</h2>
        {tests.length === 0 ? (
          <div className="glass-card" style={{ padding: "22px", marginBottom: "28px", color: "var(--color-text-secondary)" }}>No tests have been assigned to your account yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "12px", marginBottom: "28px" }}>
            {tests.map((test) => (
              <article key={test.id} className="glass-card" style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div><strong>{test.title}</strong><div style={{ color: "var(--color-text-secondary)", fontSize: ".84rem", marginTop: "5px" }}>{test.duration} minutes · {test.questionCount} questions · {test.totalMarks} marks · {test.status}</div></div>
                <Link href={`/student/tests/${encodeURIComponent(test.testCode)}`} style={{ color: "#4f8ef7", fontWeight: 700, textDecoration: "none" }}>Open test →</Link>
              </article>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "14px" }}>Recent attempts</h2>
        {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading your attempts…</p> : attempts.length === 0 ? (
          <div className="glass-card" style={{ padding: "28px", color: "var(--color-text-secondary)" }}>You have no attempts yet. Enter a test code above to get started.</div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {attempts.map((attempt) => (
              <div key={attempt.id} className="glass-card" style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <strong>{attempt.testTitle}</strong>
                  <div style={{ marginTop: "6px", fontSize: ".83rem", color: "var(--color-text-secondary)" }}>
                    {attempt.status === "in_progress" ? "In progress" : `${attempt.status} · ${attempt.score ?? 0}/${attempt.totalMarks ?? 0}`}
                  </div>
                </div>
                {attempt.status === "in_progress" && <Link href={`/student/exam/${encodeURIComponent(attempt.id)}`} style={{ color: "#4f8ef7", fontWeight: 700 }}>Resume exam →</Link>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
