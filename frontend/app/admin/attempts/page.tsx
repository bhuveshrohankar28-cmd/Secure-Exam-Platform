"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api/endpoints";
import { AttemptWithViolations, Violation } from "@/types";
import { sortAttemptsByScore } from "@/lib/utils/filter";
import { computePercentage } from "@/lib/utils/scores";

const navItems = [
  ["Dashboard", "/admin/dashboard"],
  ["Users", "/admin/users"],
  ["Tests", "/admin/tests"],
  ["Test Access", "/admin/access"],
  ["Attempts", "/admin/attempts"],
  ["Reports", "/admin/reports"],
];

export default function AdminAttemptsPage() {
  const [attempts, setAttempts] = useState<AttemptWithViolations[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortByScore, setSortByScore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [violationDetails, setViolationDetails] = useState<Record<string, Violation[]>>({});
  const [loadingViolations, setLoadingViolations] = useState<string | null>(null);

  const loadAttempts = useCallback(async () => {
    const response = await adminApi.getAttempts(
      statusFilter ? { status: statusFilter } : undefined
    );
    if (response.success && Array.isArray(response.data)) {
      setAttempts(response.data as AttemptWithViolations[]);
      setError(null);
    } else {
      setError(response.error || "Could not load attempts.");
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .getAttempts(statusFilter ? { status: statusFilter } : undefined)
      .then((response) => {
        if (!active) return;
        if (response.success && Array.isArray(response.data)) {
          setAttempts(response.data as AttemptWithViolations[]);
          setError(null);
        } else {
          setError(response.error || "Could not load attempts.");
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter]);

  async function resetAttempt(attempt: AttemptWithViolations) {
    if (
      !window.confirm(
        `Reset ${attempt.userName || "this student's"} attempt for "${attempt.testTitle}"?`
      )
    )
      return;
    setBusyId(attempt.id);
    const response = await adminApi.resetAttempt(attempt.id);
    if (response.success) await loadAttempts();
    else setError(response.error || "Could not reset this attempt.");
    setBusyId(null);
  }

  async function forceSubmitAttempt(attempt: AttemptWithViolations) {
    if (
      !window.confirm(
        `Force-submit ${attempt.userName || "this student's"} attempt for "${attempt.testTitle}"? This will grade the attempt immediately.`
      )
    )
      return;
    setBusyId(attempt.id);
    const response = await adminApi.forceSubmit(attempt.id);
    if (response.success) await loadAttempts();
    else setError(response.error || "Could not force-submit this attempt.");
    setBusyId(null);
  }

  async function toggleViolationDetails(attempt: AttemptWithViolations) {
    if (expandedId === attempt.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(attempt.id);
    if (!violationDetails[attempt.id]) {
      setLoadingViolations(attempt.id);
      const response = await adminApi.getAttemptViolations(attempt.id);
      if (response.success && Array.isArray(response.data)) {
        setViolationDetails((prev) => ({
          ...prev,
          [attempt.id]: response.data as Violation[],
        }));
      }
      setLoadingViolations(null);
    }
  }

  const displayedAttempts = sortByScore ? sortAttemptsByScore(attempts) : attempts;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside
        style={{
          width: "220px",
          background: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-border)",
          padding: "24px 12px",
        }}
      >
        <strong style={{ display: "block", padding: "0 8px 20px" }}>Admin Panel</strong>
        <nav style={{ display: "grid", gap: "4px" }}>
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: "10px",
                borderRadius: "8px",
                textDecoration: "none",
                color:
                  href === "/admin/attempts"
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                background:
                  href === "/admin/attempts" ? "rgba(79,142,247,.1)" : "transparent",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Exam Attempts</h1>
        <p style={{ margin: "6px 0 20px", color: "var(--color-text-secondary)" }}>
          Review submissions and allow a student to retake a test by resetting their attempt.
        </p>

        {/* Filter / sort controls */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            aria-label="Filter attempts by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              minHeight: "44px",
            }}
          >
            <option value="">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="force_submitted">Force submitted</option>
          </select>

          <button
            onClick={() => setSortByScore((prev) => !prev)}
            aria-pressed={sortByScore}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              background: sortByScore ? "rgba(79,142,247,.15)" : "transparent",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            {sortByScore ? "Sorted: Score ↓" : "Sort by Score"}
          </button>

          <button
            onClick={() => void loadAttempts()}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              background: "transparent",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" style={{ color: "#f87171", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)" }}>Loading attempts…</p>
        ) : displayedAttempts.length === 0 ? (
          <div
            className="glass-card"
            style={{ padding: "26px", color: "var(--color-text-secondary)" }}
          >
            No attempts match this filter.
          </div>
        ) : (
          <div className="glass-card" style={{ padding: "12px", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "var(--color-text-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {[
                    "Student",
                    "Test",
                    "Status",
                    "Score",
                    "Violations",
                    "Started",
                    "Actions",
                  ].map((title) => (
                    <th key={title} style={{ padding: "12px" }}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedAttempts.map((attempt) => (
                  <>
                    <tr
                      key={attempt.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
                    >
                      <td style={{ padding: "12px" }}>{attempt.userName || "Student"}</td>
                      <td style={{ padding: "12px" }}>{attempt.testTitle}</td>
                      <td style={{ padding: "12px" }}>
                        {attempt.status.replace(/_/g, " ")}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {attempt.score === null || attempt.totalMarks === null
                          ? "—"
                          : `${attempt.score} / ${attempt.totalMarks} (${computePercentage(attempt.score, attempt.totalMarks)}%)`}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => void toggleViolationDetails(attempt)}
                          aria-expanded={expandedId === attempt.id}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            minHeight: "28px",
                            background:
                              attempt.violationCount > 0
                                ? "rgba(251,191,36,.2)"
                                : "rgba(156,163,175,.2)",
                            color:
                              attempt.violationCount > 0 ? "#f59e0b" : "var(--color-text-secondary)",
                          }}
                        >
                          {attempt.violationCount} violation
                          {attempt.violationCount !== 1 ? "s" : ""}
                        </button>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {new Date(attempt.startedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            disabled={busyId === attempt.id}
                            onClick={() => void resetAttempt(attempt)}
                            style={{
                              padding: "7px 10px",
                              border: "1px solid var(--color-border)",
                              borderRadius: "7px",
                              color: "var(--color-text-primary)",
                              background: "transparent",
                              cursor: busyId === attempt.id ? "wait" : "pointer",
                              minHeight: "44px",
                            }}
                          >
                            {busyId === attempt.id ? "Working…" : "Reset"}
                          </button>
                          {attempt.status === "in_progress" && (
                            <button
                              disabled={busyId === attempt.id}
                              onClick={() => void forceSubmitAttempt(attempt)}
                              style={{
                                padding: "7px 10px",
                                border: "1px solid #f59e0b",
                                borderRadius: "7px",
                                color: "#f59e0b",
                                background: "transparent",
                                cursor: busyId === attempt.id ? "wait" : "pointer",
                                minHeight: "44px",
                              }}
                            >
                              {busyId === attempt.id ? "Working…" : "Force Submit"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable violation detail row */}
                    {expandedId === attempt.id && (
                      <tr key={`${attempt.id}-violations`}>
                        <td
                          colSpan={7}
                          style={{
                            padding: "12px 20px",
                            background: "rgba(0,0,0,.15)",
                            borderBottom: "1px solid rgba(255,255,255,.05)",
                          }}
                        >
                          {loadingViolations === attempt.id ? (
                            <span style={{ color: "var(--color-text-secondary)" }}>
                              Loading violations…
                            </span>
                          ) : (violationDetails[attempt.id] ?? []).length === 0 ? (
                            <span style={{ color: "var(--color-text-secondary)" }}>
                              No violations were recorded for this attempt.
                            </span>
                          ) : (
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "0.875rem",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    color: "var(--color-text-secondary)",
                                    borderBottom: "1px solid var(--color-border)",
                                  }}
                                >
                                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Type</th>
                                  <th style={{ padding: "6px 10px", textAlign: "left" }}>
                                    Timestamp
                                  </th>
                                  <th style={{ padding: "6px 10px", textAlign: "left" }}>
                                    Details
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(violationDetails[attempt.id] ?? []).map((v) => (
                                  <tr key={v.id}>
                                    <td style={{ padding: "6px 10px" }}>
                                      {v.type.replace(/_/g, " ")}
                                    </td>
                                    <td style={{ padding: "6px 10px" }}>
                                      {new Date(v.timestamp).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "6px 10px" }}>
                                      {Object.keys(v.metadata).length > 0
                                        ? JSON.stringify(v.metadata)
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
