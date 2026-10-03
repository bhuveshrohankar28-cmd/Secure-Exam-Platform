"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { attemptsApi, LobbyResponse, testsApi } from "@/lib/api/endpoints";

export default function TestInstructionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params.id);
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadLobby() {
    const result = await testsApi.getLobby(code);
    if (result.success && result.data) {
      setLobby(result.data);
      setError(null);
    } else {
      setError(result.error || "Could not load this test.");
    }
  }

  useEffect(() => {
    let active = true;
    testsApi.getLobby(code).then((result) => {
      if (!active) return;
      if (result.success && result.data) {
        setLobby(result.data);
        setError(null);
      } else {
        setError(result.error || "Could not load this test.");
      }
    });
    return () => { active = false; };
  }, [code]);

  async function beginTest() {
    setBusy(true);
    setError(null);
    const result = await attemptsApi.start(code);
    if (result.success && result.data?.attempt) {
      router.replace(`/student/exam/${encodeURIComponent(result.data.attempt.id)}`);
    } else {
      setError(result.error || "Could not start the test.");
    }
    setBusy(false);
  }

  async function resumeTest() {
    if (!lobby?.attempt) return;
    router.replace(`/student/exam/${encodeURIComponent(lobby.attempt.id)}`);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div className="glass-card" style={{ padding: "36px 32px", width: "100%", maxWidth: "560px" }}>
        <Link href="/student/dashboard" style={{ color: "#4f8ef7", textDecoration: "none" }}>← Dashboard</Link>
        {error && <div role="alert" style={{ marginTop: "18px", padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,.12)", color: "#f87171" }}>{error}</div>}
        {!lobby ? <p style={{ marginTop: "22px", color: "var(--color-text-secondary)" }}>Loading test…</p> : (
          <>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "20px", marginBottom: "8px" }}>{lobby.test.title}</h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "20px" }}>{lobby.test.description || "Review these instructions before beginning."}</p>
            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", marginBottom: "22px", color: "var(--color-text-secondary)" }}>
              <span>⏱ {lobby.test.duration} minutes</span>
              <span>❓ {lobby.test.questionCount} questions</span>
              <span>📊 {lobby.test.totalMarks} marks</span>
            </div>
            <ol style={{ paddingLeft: "22px", display: "grid", gap: "10px", marginBottom: "26px", color: "var(--color-text-secondary)" }}>
              <li>The timer starts as soon as you begin and cannot be paused.</li>
              <li>Your answers are saved as you work.</li>
              <li>Submit before time runs out. The exam is submitted automatically at the deadline.</li>
            </ol>
            {lobby.state === "waiting" && <p role="status" style={{ marginBottom: "18px", color: "#f59e0b" }}>The examiner has not opened this test yet. Refresh to check again.</p>}
            {lobby.state === "ended" && <p role="status" style={{ marginBottom: "18px", color: "var(--color-text-secondary)" }}>This test has ended and no attempt was started.</p>}
            {lobby.state === "finished" && <p role="status" style={{ marginBottom: "18px", color: "var(--color-text-secondary)" }}>This test attempt has already been submitted.</p>}
            <div style={{ display: "flex", gap: "12px" }}>
              {lobby.state === "ready" && <button onClick={beginTest} disabled={busy} style={{ flex: 1, padding: "14px", border: 0, borderRadius: "9px", color: "#fff", fontWeight: 700, background: "var(--gradient-primary)", cursor: busy ? "wait" : "pointer", opacity: busy ? .7 : 1 }}>{busy ? "Starting…" : "Start exam"}</button>}
              {lobby.state === "in_progress" && <button onClick={resumeTest} style={{ flex: 1, padding: "14px", border: 0, borderRadius: "9px", color: "#fff", fontWeight: 700, background: "var(--gradient-primary)", cursor: "pointer" }}>Resume exam</button>}
              {(lobby.state === "waiting" || lobby.state === "ended" || lobby.state === "finished") && <button onClick={() => void loadLobby()} style={{ flex: 1, padding: "14px", border: "1px solid var(--color-border)", borderRadius: "9px", color: "var(--color-text-primary)", background: "transparent", cursor: "pointer" }}>Refresh status</button>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
