"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/api/endpoints";
import type { AttemptWithViolations, AttemptStatus } from "@/types";
import { formatTimeMMSS } from "@/lib/utils/time";

// ── Constants ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/tests", label: "Tests", icon: "📋" },
  { href: "/admin/access", label: "Test Access", icon: "🔑" },
  { href: "/admin/attempts", label: "Attempts", icon: "📝" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
];

const POLL_INTERVAL_MS = 15_000;

// ── Types ──────────────────────────────────────────────────────────────────

interface ForceSubmitResult {
  attemptId: string;
  status: "success" | "error";
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isCompleted(status: AttemptStatus): boolean {
  return status === "graded" || status === "force_submitted" || status === "submitted";
}

// ── Sub-component: remaining time cell that ticks every second ─────────────

function RemainingTimeCell({ endsAt }: { endsAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now())
  );

  useEffect(() => {
    const deadline = new Date(endsAt).getTime();
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    }, 1_000);
    return () => clearInterval(id);
  }, [endsAt]);

  const isLow = remainingMs <= 300_000;
  const isCritical = remainingMs <= 60_000;

  return (
    <span
      style={{
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        color: isCritical ? "#ef4444" : isLow ? "#f59e0b" : "var(--color-text-primary)",
      }}
    >
      ⏱ {formatTimeMMSS(remainingMs)}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LiveMonitorPage() {
  const params = useParams<{ testId: string }>();
  const testId = decodeURIComponent(params.testId);

  // ── State ──────────────────────────────────────────────────────────────
  const [inProgress, setInProgress] = useState<AttemptWithViolations[]>([]);
  const [completed, setCompleted] = useState<AttemptWithViolations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceResults, setForceResults] = useState<ForceSubmitResult[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch and partition attempts ───────────────────────────────────────
  const fetchAttempts = useCallback(async () => {
    const [inProgressRes, allRes] = await Promise.all([
      adminApi.getAttempts({ testId, status: "in_progress" }),
      adminApi.getAttempts({ testId }),
    ]);

    if (!inProgressRes.success) {
      setError(inProgressRes.error ?? "Could not refresh participant list.");
      return;
    }

    setError(null);

    const inProg = Array.isArray(inProgressRes.data)
      ? (inProgressRes.data as AttemptWithViolations[])
      : [];

    // Completed attempts: everything from all-attempts that is not in_progress
    const allAttempts = allRes.success && Array.isArray(allRes.data)
      ? (allRes.data as AttemptWithViolations[])
      : [];
    const comp = allAttempts.filter((a) => isCompleted(a.status));

    setInProgress(inProg);
    setCompleted(comp);
    setLastRefreshed(new Date());
    setSecondsSinceRefresh(0);
  }, [testId]);

  // ── Initial load + polling loop ────────────────────────────────────────
  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(async () => {
      await fetchAttempts();
      scheduleNextPoll();
    }, POLL_INTERVAL_MS);
  }, [fetchAttempts]);

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchAttempts();
      if (active) {
        setLoading(false);
        scheduleNextPoll();
      }
    })();
    return () => {
      active = false;
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
    };
  }, [fetchAttempts, scheduleNextPoll]);

  // ── Seconds-since-refresh ticker ───────────────────────────────────────
  useEffect(() => {
    secondsTimerRef.current = setInterval(() => {
      setSecondsSinceRefresh((s) => s + 1);
    }, 1_000);
    return () => {
      if (secondsTimerRef.current !== null) clearInterval(secondsTimerRef.current);
    };
  }, []);

  // ── Force submit ───────────────────────────────────────────────────────
  async function handleForceSubmit(attempt: AttemptWithViolations) {
    if (!window.confirm(`Force-submit attempt for "${attempt.userName ?? attempt.userId}"?`)) return;

    setBusyIds((prev) => new Set(prev).add(attempt.id));
    setForceResults((prev) => prev.filter((r) => r.attemptId !== attempt.id));

    const response = await adminApi.forceSubmit(attempt.id);

    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(attempt.id);
      return next;
    });

    if (response.success) {
      // Update attempt in-place optimistically, then refresh
      setForceResults((prev) => [
        ...prev,
        { attemptId: attempt.id, status: "success" },
      ]);
      await fetchAttempts();
    } else {
      setForceResults((prev) => [
        ...prev,
        {
          attemptId: attempt.id,
          status: "error",
          error: response.error ?? "Force submit failed.",
        },
      ]);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  function getForceError(attemptId: string): string | undefined {
    return forceResults.find((r) => r.attemptId === attemptId && r.status === "error")?.error;
  }

  const refreshLabel = lastRefreshed
    ? secondsSinceRefresh === 0
      ? "just now"
      : `${secondsSinceRefresh}s ago`
    : "—";

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
                color: "var(--color-text-secondary)",
                background: "transparent",
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
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <Link
              href="/admin/tests"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                fontSize: "0.875rem",
                marginBottom: "8px",
              }}
            >
              ← Back to Tests
            </Link>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
              📡 Live Monitor
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: "4px 0 0" }}>
              Test ID: <code style={{ fontFamily: "monospace" }}>{testId}</code>
            </p>
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              textAlign: "right",
            }}
          >
            <div>🔄 Auto-refreshes every 15 s</div>
            <div>Last refreshed: {refreshLabel}</div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              borderRadius: "8px",
              background: "rgba(239,68,68,.12)",
              color: "#f87171",
              fontSize: "0.9rem",
            }}
          >
            ⚠️ {error} — continuing to poll every 15 s.
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)" }}>Loading participants…</p>
        ) : (
          <div style={{ display: "grid", gap: "24px" }}>
            {/* ── In-progress participants ───────────────────────────── */}
            <section className="glass-card" style={{ padding: "22px" }}>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 6px #10b981",
                  }}
                />
                In Progress ({inProgress.length})
              </h2>

              {inProgress.length === 0 ? (
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                  No active participants right now.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {inProgress.map((attempt) => {
                    const busy = busyIds.has(attempt.id);
                    const forceError = getForceError(attempt.id);
                    return (
                      <article
                        key={attempt.id}
                        style={{
                          padding: "14px 16px",
                          background: "rgba(255,255,255,.03)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Student info */}
                        <div style={{ flex: 1, minWidth: "160px" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                            {attempt.userName ?? attempt.userId}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-text-secondary)",
                              marginTop: "2px",
                            }}
                          >
                            ID: {attempt.userId}
                          </div>
                        </div>

                        {/* Answered count */}
                        <div style={{ textAlign: "center", minWidth: "70px" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                            Answered
                          </div>
                          <div style={{ fontWeight: 700 }}>
                            {attempt.answeredCount ?? "—"}
                          </div>
                        </div>

                        {/* Violation badge */}
                        <div style={{ textAlign: "center", minWidth: "70px" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                            Violations
                          </div>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              background:
                                attempt.violationCount > 0
                                  ? "rgba(245,158,11,.18)"
                                  : "rgba(255,255,255,.06)",
                              color:
                                attempt.violationCount > 0
                                  ? "#f59e0b"
                                  : "var(--color-text-secondary)",
                              border:
                                attempt.violationCount > 0
                                  ? "1px solid rgba(245,158,11,.4)"
                                  : "1px solid var(--color-border)",
                            }}
                            aria-label={`${attempt.violationCount} violation${attempt.violationCount !== 1 ? "s" : ""}`}
                          >
                            {attempt.violationCount > 0 && "⚠️ "}
                            {attempt.violationCount}
                          </span>
                        </div>

                        {/* Remaining time */}
                        <div style={{ textAlign: "center", minWidth: "90px" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                            Time Left
                          </div>
                          <RemainingTimeCell endsAt={attempt.endsAt} />
                        </div>

                        {/* Force submit */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleForceSubmit(attempt)}
                            style={{
                              minHeight: "44px",
                              minWidth: "44px",
                              padding: "0 14px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,.4)",
                              color: "#f87171",
                              background: "transparent",
                              cursor: busy ? "wait" : "pointer",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              opacity: busy ? 0.6 : 1,
                              whiteSpace: "nowrap",
                            }}
                            aria-label={`Force submit attempt for ${attempt.userName ?? attempt.userId}`}
                          >
                            {busy ? "Submitting…" : "Force Submit"}
                          </button>
                          {forceError && (
                            <span
                              role="alert"
                              style={{ color: "#f87171", fontSize: "0.75rem", maxWidth: "150px", textAlign: "right" }}
                            >
                              {forceError}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Completed participants ─────────────────────────────── */}
            <section className="glass-card" style={{ padding: "22px" }}>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  marginBottom: "14px",
                }}
              >
                Completed ({completed.length})
              </h2>

              {completed.length === 0 ? (
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                  No completed attempts yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {completed.map((attempt) => (
                    <article
                      key={attempt.id}
                      style={{
                        padding: "14px 16px",
                        background: "rgba(255,255,255,.03)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Student info */}
                      <div style={{ flex: 1, minWidth: "160px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {attempt.userName ?? attempt.userId}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-secondary)",
                            marginTop: "2px",
                          }}
                        >
                          ID: {attempt.userId}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background:
                            attempt.status === "force_submitted"
                              ? "rgba(239,68,68,.12)"
                              : "rgba(16,185,129,.12)",
                          color:
                            attempt.status === "force_submitted"
                              ? "#f87171"
                              : "#34d399",
                          border:
                            attempt.status === "force_submitted"
                              ? "1px solid rgba(239,68,68,.3)"
                              : "1px solid rgba(16,185,129,.3)",
                        }}
                      >
                        {attempt.status === "force_submitted" ? "Force Submitted" : "Submitted"}
                      </span>

                      {/* Score */}
                      <div style={{ textAlign: "center", minWidth: "100px" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          Score
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {attempt.score !== null && attempt.totalMarks !== null
                            ? `${attempt.score} / ${attempt.totalMarks}`
                            : "Pending"}
                        </div>
                      </div>

                      {/* Violation badge */}
                      <div style={{ textAlign: "center", minWidth: "70px" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          Violations
                        </div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            background:
                              attempt.violationCount > 0
                                ? "rgba(245,158,11,.18)"
                                : "rgba(255,255,255,.06)",
                            color:
                              attempt.violationCount > 0
                                ? "#f59e0b"
                                : "var(--color-text-secondary)",
                            border:
                              attempt.violationCount > 0
                                ? "1px solid rgba(245,158,11,.4)"
                                : "1px solid var(--color-border)",
                          }}
                          aria-label={`${attempt.violationCount} violation${attempt.violationCount !== 1 ? "s" : ""}`}
                        >
                          {attempt.violationCount > 0 && "⚠️ "}
                          {attempt.violationCount}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
