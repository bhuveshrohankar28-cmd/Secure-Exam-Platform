"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, testsApi } from "@/lib/api/endpoints";
import { CopyButton } from "@/components/ui/CopyButton";
import { nextStatuses } from "@/lib/utils/testStatus";
import { validateDuration } from "@/lib/utils/validation";
import { QuestionInput, Test, TestStatus } from "@/types";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/tests", label: "Tests", icon: "📋" },
  { href: "/admin/access", label: "Test Access", icon: "🔑" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  background: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
};

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [questionsJson, setQuestionsJson] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [filterStatus, setFilterStatus] = useState<TestStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadTests() {
    const response = await adminApi.getTests();
    if (response.success && Array.isArray(response.data)) {
      setTests(response.data);
      setSelectedId((current) => current || response.data?.[0]?.id || "");
    } else {
      setError(response.error || "Could not load tests.");
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    adminApi.getTests().then((response) => {
      if (!active) return;
      if (response.success && Array.isArray(response.data)) {
        setTests(response.data);
        setSelectedId((current) => current || response.data?.[0]?.id || "");
      } else {
        setError(response.error || "Could not load tests.");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function createTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDurationError(null);
    const durationValidation = validateDuration(duration);
    if (!durationValidation.valid) {
      setDurationError(durationValidation.error ?? "Duration must be between 5 and 300 minutes");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const response = await testsApi.create({ title, description, duration });
    if (response.success && response.data) {
      setTests((previous) => [response.data!, ...previous]);
      setSelectedId(response.data.id);
      setTitle("");
      setDescription("");
      router.push(`/admin/tests/${response.data.id}`);
    } else {
      setError(response.error || "Could not create test.");
    }
    setBusy(false);
  }

  async function importQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(questionsJson);
    } catch (parseError) {
      setError(parseError instanceof Error ? `Question JSON is invalid: ${parseError.message}` : "Question JSON is invalid.");
      return;
    }
    if (!Array.isArray(parsed)) {
      setError("Question data must be a JSON array.");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await testsApi.importQuestions(selectedId, parsed as QuestionInput[], importMode);
    if (response.success && response.data) {
      setNotice(`Questions imported. ${response.data.questionCount} total question(s), ${response.data.totalMarks} marks. Test code: ${response.data.testCode}`);
      await loadTests();
    } else {
      setError([response.error, ...(response.details || [])].filter(Boolean).join(" "));
    }
    setBusy(false);
  }

  async function updateStatus(test: Test, status: TestStatus) {
    setBusy(true);
    setError(null);
    const response = await testsApi.update(test.id, { status });
    if (response.success) {
      setNotice(`Test status changed to ${status}.`);
      await loadTests();
    } else {
      setError(response.error || "Could not update test status.");
    }
    setBusy(false);
  }

  async function regenerateCode(test: Test) {
    setBusy(true);
    setError(null);
    const response = await testsApi.regenerateCode(test.id);
    if (response.success && response.data) {
      setNotice(`A new student code was generated: ${response.data.testCode}`);
      await loadTests();
    } else {
      setError(response.error || "Could not regenerate the test code.");
    }
    setBusy(false);
  }

  async function deleteTest(test: Test) {
    if (!window.confirm(`Delete "${test.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    const response = await testsApi.delete(test.id);
    if (response.success) {
      setTests((previous) => previous.filter((item) => item.id !== test.id));
      if (selectedId === test.id) setSelectedId("");
      setNotice("Test deleted.");
    } else {
      setError(response.error || "Could not delete test.");
    }
    setBusy(false);
  }

  const selectedTest = tests.find((test) => test.id === selectedId);
  const filteredTests = filterStatus === "all" ? tests : tests.filter((test) => test.status === filterStatus);
  // All distinct statuses present in the list for the filter dropdown
  const distinctStatuses = Array.from(new Set(tests.map((test) => test.status))) as TestStatus[];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside style={{ width: "240px", background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--color-border)" }}><div style={{ fontSize: "1.5rem" }}>🛡️</div><div style={{ fontWeight: 800 }}>Admin Panel</div></div>
        <nav style={{ padding: "12px" }}>{NAV_ITEMS.map((item) => <Link key={item.href} href={item.href} style={{ display: "flex", gap: "10px", padding: "10px 12px", borderRadius: "10px", textDecoration: "none", color: item.href === "/admin/tests" ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: item.href === "/admin/tests" ? "rgba(79,142,247,.1)" : "transparent" }}><span>{item.icon}</span>{item.label}</Link>)}</nav>
      </aside>
      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Tests</h1>
        <p style={{ color: "var(--color-text-secondary)", margin: "6px 0 22px" }}>Create examinations, import questions, and manage their lifecycle.</p>
        {error && <div role="alert" style={{ padding: "12px 16px", marginBottom: "16px", borderRadius: "8px", background: "rgba(239,68,68,.12)", color: "#f87171" }}>{error}</div>}
        {notice && <div role="status" style={{ padding: "12px 16px", marginBottom: "16px", borderRadius: "8px", background: "rgba(16,185,129,.12)", color: "#34d399" }}>{notice}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .8fr) minmax(360px, 1.2fr)", gap: "18px", alignItems: "start" }}>
          <section className="glass-card" style={{ padding: "22px" }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: "16px" }}>Create a test</h2>
            <form onSubmit={createTest} style={{ display: "grid", gap: "12px" }}>
              <label>Title<input required minLength={3} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} /></label>
              <label>Description<textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} style={inputStyle} /></label>
              <label>Duration (minutes)<input required type="number" min={1} max={300} value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setDurationError(null); }} style={inputStyle} /></label>
              {durationError && <div role="alert" style={{ color: "#f87171", fontSize: ".85rem" }}>{durationError}</div>}
              <button disabled={busy} type="submit" style={{ padding: "11px", border: 0, borderRadius: "8px", color: "#fff", background: "var(--gradient-primary)", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Working…" : "Create test"}</button>
            </form>
          </section>

          <section className="glass-card" style={{ padding: "22px" }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: "16px" }}>Import questions</h2>
            {tests.length === 0 ? <p style={{ color: "var(--color-text-secondary)" }}>Create a test first.</p> : (
              <form onSubmit={importQuestions} style={{ display: "grid", gap: "12px" }}>
                <label>Test<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} style={inputStyle}>{tests.map((test) => <option key={test.id} value={test.id}>{test.title} ({test.status})</option>)}</select></label>
                <label>Import mode<select value={importMode} onChange={(event) => setImportMode(event.target.value as "append" | "replace")} style={inputStyle}><option value="append">Append to current questions</option><option value="replace">Replace current questions</option></select></label>
                <label>Question JSON<textarea value={questionsJson} onChange={(event) => setQuestionsJson(event.target.value)} placeholder="Paste your question JSON array here." rows={12} spellCheck={false} style={{ ...inputStyle, fontFamily: "monospace", fontSize: ".82rem" }} /></label>
                <button disabled={busy || !selectedId || !["draft", "scheduled"].includes(selectedTest?.status || "")} type="submit" style={{ padding: "11px", border: 0, borderRadius: "8px", color: "#fff", background: "var(--gradient-primary)", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>Import questions</button>
              </form>
            )}
          </section>
        </div>

        <section style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Existing tests</h2>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: ".88rem", color: "var(--color-text-secondary)", marginLeft: "auto" }}>
              Filter by status:
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as TestStatus | "all")}
                style={{ ...inputStyle, width: "auto", padding: "6px 10px" }}
              >
                <option value="all">All</option>
                {distinctStatuses.map((s) => (
                  <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>
          {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p> : filteredTests.length === 0 ? <div className="glass-card" style={{ padding: "24px", color: "var(--color-text-secondary)" }}>{tests.length === 0 ? "No tests created yet." : "No tests found."}</div> : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredTests.map((test) => (
                <article key={test.id} className="glass-card" style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", border: selectedId === test.id ? "1px solid rgba(79,142,247,.55)" : undefined }}>
                  <div><strong>{test.title}</strong><div style={{ color: "var(--color-text-secondary)", fontSize: ".83rem", marginTop: "5px" }}>{test.duration} min · {test.questionCount} questions · {test.totalMarks} marks · {test.status}</div><div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}><span style={{ color: "var(--color-text-secondary)", fontSize: ".83rem" }}>Student code:</span><CopyButton text={test.testCode} displayText={test.testCode} label={`Copy student code ${test.testCode}`} /></div></div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Link href={`/admin/tests/${test.id}`} style={{ display: "inline-flex", alignItems: "center", padding: "8px 10px", borderRadius: "7px", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", background: "transparent", textDecoration: "none", fontSize: ".9rem", minHeight: "44px" }}>View/Edit</Link>
                    <button disabled={busy || !["draft", "scheduled"].includes(test.status)} onClick={() => setSelectedId(test.id)} style={{ padding: "8px 10px", borderRadius: "7px", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", background: "transparent", cursor: "pointer" }}>Select for import</button>
                    {nextStatuses(test.status).map((status) => <button key={status} disabled={busy || (["scheduled", "active"].includes(status) && test.questionCount === 0)} onClick={() => void updateStatus(test, status)} style={{ padding: "8px 10px", borderRadius: "7px", border: 0, color: "#fff", background: "var(--color-accent-blue)", cursor: "pointer" }}>{status === "active" ? "Open" : status === "completed" ? "End" : status[0].toUpperCase() + status.slice(1)}</button>)}
                    <button disabled={busy} onClick={() => void regenerateCode(test)} style={{ padding: "8px 10px", borderRadius: "7px", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", background: "transparent", cursor: "pointer" }}>New code</button>
                    {["draft", "scheduled", "archived"].includes(test.status) && <button disabled={busy} onClick={() => void deleteTest(test)} style={{ padding: "8px 10px", borderRadius: "7px", border: "1px solid rgba(239,68,68,.4)", color: "#f87171", background: "transparent", cursor: "pointer" }}>Delete</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
