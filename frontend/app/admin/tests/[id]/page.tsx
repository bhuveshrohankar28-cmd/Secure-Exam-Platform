"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { adminApi, TestDetails, testsApi } from "@/lib/api/endpoints";
import type { AttemptWithViolations, QuestionInput, TestStatus } from "@/types";
import { CopyButton } from "@/components/ui/CopyButton";
import { nextStatuses } from "@/lib/utils/testStatus";

// ── Constants ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/tests", label: "Tests", icon: "📋" },
  { href: "/admin/access", label: "Test Access", icon: "🔑" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
];

const STATUS_COLORS: Record<TestStatus, string> = {
  draft: "#a1a1aa",
  scheduled: "#f59e0b",
  active: "#10b981",
  completed: "#4f8ef7",
  archived: "#6b7280",
};

const TRANSITION_LABELS: Partial<Record<TestStatus, string>> = {
  active: "Open",
  completed: "End",
};

// ── Shared style helpers ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  background: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  fontSize: "0.95rem",
  boxSizing: "border-box",
};

// ── Page component ─────────────────────────────────────────────────────────

export default function TestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);

  // ── Test data ──────────────────────────────────────────────────────────
  const [test, setTest] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Question import form ───────────────────────────────────────────────
  const [questionsJson, setQuestionsJson] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // ── Live participant count ─────────────────────────────────────────────
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const participantIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load test ──────────────────────────────────────────────────────────
  const loadTest = useCallback(async () => {
    const response = await testsApi.getById(id);
    if (response.success && response.data) {
      setTest(response.data);
    } else {
      setError(response.error || "Could not load test details.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let active = true;
    testsApi.getById(id).then((response) => {
      if (!active) return;
      if (response.success && response.data) {
        setTest(response.data);
      } else {
        setError(response.error || "Could not load test details.");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  // ── Live participant polling (only when status === "active") ───────────
  const fetchParticipants = useCallback(async () => {
    const response = await adminApi.getAttempts({ testId: id, status: "in_progress" });
    if (response.success && Array.isArray(response.data)) {
      setParticipantCount((response.data as AttemptWithViolations[]).length);
    }
  }, [id]);

  useEffect(() => {
    if (test?.status !== "active") {
      if (participantIntervalRef.current !== null) {
        clearInterval(participantIntervalRef.current);
        participantIntervalRef.current = null;
      }
      setParticipantCount(null);
      return;
    }

    // Fetch immediately, then every 30 s
    void fetchParticipants();
    participantIntervalRef.current = setInterval(() => {
      void fetchParticipants();
    }, 30_000);

    return () => {
      if (participantIntervalRef.current !== null) {
        clearInterval(participantIntervalRef.current);
        participantIntervalRef.current = null;
      }
    };
  }, [test?.status, fetchParticipants]);

  // ── Status transition ──────────────────────────────────────────────────
  async function handleStatusTransition(nextStatus: TestStatus) {
    if (!test) return;

    // Guard: cannot activate a test with zero questions (Req 8.4)
    if (nextStatus === "active" && test.questionCount === 0) {
      setError("Questions must be imported before you can activate this test.");
      return;
    }

    const label = TRANSITION_LABELS[nextStatus] ?? (nextStatus[0].toUpperCase() + nextStatus.slice(1));
    if (!window.confirm(`Change status to "${label}"?`)) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await testsApi.update(id, { status: nextStatus });
    if (response.success) {
      setNotice(`Status updated to "${nextStatus}".`);
      await loadTest();
    } else {
      setError(response.error || "Could not update test status.");
    }
    setBusy(false);
  }

  // ── Regenerate code ────────────────────────────────────────────────────
  async function handleRegenerateCode() {
    if (!window.confirm("Generate a new test code? The old code will stop working.")) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await testsApi.regenerateCode(id);
    if (response.success && response.data) {
      setNotice(`New test code generated: ${response.data.testCode}`);
      setTest((prev) => prev ? { ...prev, testCode: response.data!.testCode } : prev);
    } else {
      setError(response.error || "Could not regenerate the test code.");
    }
    setBusy(false);
  }

  // ── Question import ────────────────────────────────────────────────────
  async function handleImportQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportErrors([]);
    setError(null);
    setNotice(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(questionsJson);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? `Question JSON is invalid: ${parseError.message}`
          : "Question JSON is invalid."
      );
      return;
    }

    if (!Array.isArray(parsed)) {
      setError("Question data must be a JSON array.");
      return;
    }

    setBusy(true);
    const response = await testsApi.importQuestions(id, parsed as QuestionInput[], importMode);

    if (response.success && response.data) {
      setNotice(
        `Import successful — ${response.data.questionCount} question(s), ${response.data.totalMarks} total marks. Code: ${response.data.testCode}`
      );
      setQuestionsJson("");
      setImportErrors([]);
      await loadTest();
    } else {
      // Collect per-question errors from details array
      const details = response.details ?? [];
      if (details.length > 0) {
        setImportErrors(details);
      } else {
        setError(response.error || "Could not import questions.");
      }
    }
    setBusy(false);
  }

  // ── Delete test ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!test) return;
    if (!window.confirm(`Delete "${test.title}"? This cannot be undone.`)) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await testsApi.delete(id);
    if (response.success) {
      router.push("/admin/tests");
    } else {
      setError(response.error || "Could not delete this test.");
      setBusy(false);
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────
  const canImport = test ? ["draft", "scheduled"].includes(test.status) : false;
  const canDelete = test ? ["draft", "scheduled", "archived"].includes(test.status) : false;
  const allowed = test ? nextStatuses(test.status) : [];

  // ── Render ─────────────────────────────────────────────────────────────
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
        }}
      >
        <div
          style={{
            padding: "0 20px 24px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ fontSize: "1.5rem" }}>🛡️</div>
          <div style={{ fontWeight: 800 }}>Admin Panel</div>
        </div>
        <nav style={{ padding: "12px" }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color:
                  item.href === "/admin/tests"
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                background:
                  item.href === "/admin/tests"
                    ? "rgba(79,142,247,.1)"
                    : "transparent",
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        {/* Back link */}
        <Link
          href="/admin/tests"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            fontSize: "0.875rem",
            marginBottom: "18px",
          }}
        >
          ← Back to Tests
        </Link>

        {/* Feedback banners */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              borderRadius: "8px",
              background: "rgba(239,68,68,.12)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              borderRadius: "8px",
              background: "rgba(16,185,129,.12)",
              color: "#34d399",
            }}
          >
            {notice}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
        ) : !test ? (
          <p role="alert" style={{ color: "#f87171" }}>
            Test not found.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>

            {/* ── Test Detail Header ───────────────────────────────────────── */}
            <section className="glass-card" style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
                    {test.title}
                  </h1>
                  {test.description && (
                    <p
                      style={{
                        color: "var(--color-text-secondary)",
                        marginTop: "6px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {test.description}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginTop: "12px",
                      fontSize: "0.85rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <span>⏱ {test.duration} min</span>
                    <span>❓ {test.questionCount} questions</span>
                    <span>🏆 {test.totalMarks} marks</span>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    background: `${STATUS_COLORS[test.status]}22`,
                    color: STATUS_COLORS[test.status],
                    border: `1px solid ${STATUS_COLORS[test.status]}55`,
                    flexShrink: 0,
                  }}
                >
                  {test.status.toUpperCase()}
                </span>
              </div>

              {/* Test code row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "18px",
                  padding: "12px 16px",
                  background: "rgba(79,142,247,.07)",
                  border: "1px solid rgba(79,142,247,.2)",
                  borderRadius: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.83rem",
                    fontWeight: 600,
                  }}
                >
                  Student Code:
                </span>
                <code
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    color: "#4f8ef7",
                    letterSpacing: "0.06em",
                    flex: 1,
                  }}
                >
                  {test.testCode}
                </code>
                <CopyButton
                  text={test.testCode}
                  label="Copy test code"
                  displayText="Copy code"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRegenerateCode()}
                  style={{
                    minHeight: "44px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-secondary)",
                    background: "transparent",
                    cursor: busy ? "wait" : "pointer",
                    fontSize: "0.83rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  🔄 New code
                </button>
              </div>
            </section>

            {/* ── Status Controls ──────────────────────────────────────────── */}
            {(allowed.length > 0 || canDelete) && (
              <section className="glass-card" style={{ padding: "22px" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "14px" }}>
                  Status controls
                </h2>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  {allowed.map((nextStatus) => {
                    const label = TRANSITION_LABELS[nextStatus] ?? (nextStatus[0].toUpperCase() + nextStatus.slice(1));
                    const isActivate = nextStatus === "active";
                    const disabledReason = isActivate && test.questionCount === 0;
                    return (
                      <button
                        key={nextStatus}
                        type="button"
                        disabled={busy || disabledReason}
                        title={
                          disabledReason
                            ? "Import questions before activating this test"
                            : undefined
                        }
                        onClick={() => void handleStatusTransition(nextStatus)}
                        style={{
                          minHeight: "44px",
                          padding: "0 18px",
                          borderRadius: "8px",
                          border: "none",
                          color: "#fff",
                          background:
                            nextStatus === "completed"
                              ? "rgba(239,68,68,.7)"
                              : nextStatus === "active"
                              ? "var(--color-accent-blue, #4f8ef7)"
                              : "rgba(79,142,247,.5)",
                          cursor: busy || disabledReason ? "not-allowed" : "pointer",
                          opacity: busy || disabledReason ? 0.6 : 1,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}

                  {canDelete && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete()}
                      style={{
                        minHeight: "44px",
                        padding: "0 18px",
                        borderRadius: "8px",
                        border: "1px solid rgba(239,68,68,.4)",
                        color: "#f87171",
                        background: "transparent",
                        cursor: busy ? "wait" : "pointer",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        marginLeft: "auto",
                      }}
                    >
                      🗑 Delete test
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* ── Live Participant Count (active tests only) ────────────────── */}
            {test.status === "active" && (
              <section className="glass-card" style={{ padding: "22px" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px" }}>
                  Live participants
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      fontSize: "2.2rem",
                      fontWeight: 800,
                      color: "#10b981",
                    }}
                  >
                    {participantCount === null ? "…" : participantCount}
                  </span>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                    student{participantCount !== 1 ? "s" : ""} currently in progress
                    <br />
                    <small>Refreshes every 30 seconds</small>
                  </span>
                </div>
              </section>
            )}

            {/* ── Question Import Form ─────────────────────────────────────── */}
            <section className="glass-card" style={{ padding: "22px" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "14px" }}>
                Import questions
              </h2>

              {!canImport ? (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,.04)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  Questions cannot be modified once a test is active.
                </p>
              ) : (
                <form onSubmit={(e) => void handleImportQuestions(e)} style={{ display: "grid", gap: "14px" }}>
                  <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                    Import mode
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as "append" | "replace")}
                      style={inputStyle}
                    >
                      <option value="append">Append to current questions</option>
                      <option value="replace">Replace all current questions</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                    Question JSON
                    <textarea
                      value={questionsJson}
                      onChange={(e) => setQuestionsJson(e.target.value)}
                      placeholder={`[\n  {\n    "text": "Question text",\n    "options": ["A", "B", "C", "D"],\n    "correctOptionIndex": 0,\n    "marks": 1\n  }\n]`}
                      rows={12}
                      spellCheck={false}
                      style={{
                        ...inputStyle,
                        fontFamily: "monospace",
                        fontSize: "0.82rem",
                        resize: "vertical",
                      }}
                    />
                  </label>

                  {/* Per-question validation errors */}
                  {importErrors.length > 0 && (
                    <div
                      role="alert"
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,.1)",
                        border: "1px solid rgba(239,68,68,.3)",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 700,
                          color: "#f87171",
                          fontSize: "0.875rem",
                          marginBottom: "8px",
                        }}
                      >
                        Import failed — fix the following errors:
                      </p>
                      <ul
                        style={{
                          paddingLeft: "20px",
                          margin: 0,
                          display: "grid",
                          gap: "4px",
                        }}
                      >
                        {importErrors.map((msg, i) => (
                          <li
                            key={i}
                            style={{ color: "#f87171", fontSize: "0.83rem" }}
                          >
                            {msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy || !questionsJson.trim()}
                    style={{
                      minHeight: "44px",
                      padding: "0 20px",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      background: "var(--gradient-primary)",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      cursor: busy || !questionsJson.trim() ? "not-allowed" : "pointer",
                      opacity: busy || !questionsJson.trim() ? 0.6 : 1,
                    }}
                  >
                    {busy ? "Working…" : "Import questions"}
                  </button>
                </form>
              )}
            </section>

            {/* ── Questions Preview ────────────────────────────────────────── */}
            {test.questions && test.questions.length > 0 && (
              <section className="glass-card" style={{ padding: "22px" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "14px" }}>
                  Questions ({test.questions.length})
                </h2>
                <div style={{ display: "grid", gap: "12px" }}>
                  {test.questions.map((question, index) => (
                    <article
                      key={question.id}
                      style={{
                        padding: "14px 16px",
                        background: "rgba(255,255,255,.03)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                      }}
                    >
                      <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: "0.9rem" }}>
                        {index + 1}. {question.text}
                      </p>
                      <ul style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "3px" }}>
                        {question.options.map((option, optIdx) => (
                          <li
                            key={optIdx}
                            style={{
                              fontSize: "0.83rem",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {option}
                          </li>
                        ))}
                      </ul>
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "0.78rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Marks: {question.marks}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
