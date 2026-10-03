"use client";

import { useState } from "react";
import { useLobbyPolling } from "@/hooks/useLobbyPolling";
import { allAcknowledged } from "@/lib/utils/lobby";
import { computePercentage } from "@/lib/utils/scores";
import { FixedActionBar } from "@/components/ui/FixedActionBar";

// ─── Props ───────────────────────────────────────────────────────────────────

interface LobbyScreenProps {
  code: string;
  onStartExam: (attemptId: string) => void;
}

// ─── Shared style tokens ─────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "16px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "var(--color-text-primary)",
  marginBottom: "8px",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  fontSize: "0.88rem",
  lineHeight: 1.5,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const chipStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  padding: "4px 10px",
  fontSize: "0.8rem",
  color: "var(--color-text-secondary)",
  whiteSpace: "nowrap",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated pulsing dot used in the waiting state. */
function PulsingDot() {
  return (
    <>
      <style>{`
        @keyframes lobby-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
        .lobby-pulse-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-accent-blue, #4f8ef7);
          animation: lobby-pulse 1.6s ease-in-out infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
      `}</style>
      <span className="lobby-pulse-dot" aria-hidden="true" />
    </>
  );
}

/** Spinner used for loading states. */
function Spinner({ size = 24 }: { size?: number }) {
  return (
    <>
      <style>{`
        @keyframes lobby-spin {
          to { transform: rotate(360deg); }
        }
        .lobby-spinner {
          border-radius: 50%;
          border-style: solid;
          border-color: rgba(255,255,255,0.15);
          border-top-color: var(--color-accent-blue, #4f8ef7);
          animation: lobby-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
      `}</style>
      <span
        className="lobby-spinner"
        role="status"
        aria-label="Loading"
        style={{ width: size, height: size, borderWidth: Math.max(2, size / 10) }}
      />
    </>
  );
}

/** Renders the 5 test metadata chips (title + meta row). */
function TestMetaSummary({
  test,
}: {
  test: {
    title: string;
    description: string;
    duration: number;
    totalMarks: number;
    questionCount: number;
  };
}) {
  return (
    <div style={cardStyle}>
      <h2 style={{ ...headingStyle, fontSize: "1.2rem" }}>{test.title}</h2>
      <p style={mutedStyle}>{test.description}</p>
      <div style={metaRowStyle}>
        <span style={chipStyle}>⏱ {test.duration} min</span>
        <span style={chipStyle}>📝 {test.questionCount} questions</span>
        <span style={chipStyle}>⭐ {test.totalMarks} marks</span>
      </div>
    </div>
  );
}

// ─── State sub-views ──────────────────────────────────────────────────────────

/** state === "waiting" */
function LobbyWaiting({
  test,
}: {
  test: {
    title: string;
    description: string;
    duration: number;
    totalMarks: number;
    questionCount: number;
  } | null;
}) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⏳</div>
      <h1
        className="gradient-text"
        style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px" }}
      >
        {test?.title ?? "Loading exam…"}
      </h1>
      <p style={{ ...mutedStyle, marginBottom: "24px" }}>
        <PulsingDot />
        Waiting for the exam to start…
      </p>

      {test && (
        <div style={metaRowStyle}>
          <span style={{ ...chipStyle, margin: "0 auto" }}>⏱ {test.duration} min</span>
          <span style={{ ...chipStyle, margin: "0 auto" }}>📝 {test.questionCount} questions</span>
          <span style={{ ...chipStyle, margin: "0 auto" }}>⭐ {test.totalMarks} marks</span>
        </div>
      )}
    </div>
  );
}

const ACKNOWLEDGMENTS = [
  "I will not switch tabs or windows during the exam",
  "I will not copy or paste any content",
  "I understand that violations are recorded",
];

/** state === "ready" */
function LobbyReady({
  test,
  onStartExam,
  attemptId,
}: {
  test: {
    title: string;
    description: string;
    duration: number;
    totalMarks: number;
    questionCount: number;
  };
  onStartExam: (id: string) => void;
  attemptId: string | null;
}) {
  const [checks, setChecks] = useState<boolean[]>(ACKNOWLEDGMENTS.map(() => false));

  const allChecked = allAcknowledged(checks);

  function toggle(i: number) {
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleStart() {
    if (allChecked && attemptId) {
      onStartExam(attemptId);
    }
  }

  return (
    <>
      {/* Scrollable content area — padded at bottom so FixedActionBar doesn't obscure */}
      <div style={{ paddingBottom: "80px" }}>
        <TestMetaSummary test={test} />

        {/* Security rules & acknowledgments — Requirements 2.2, 2.4, 2.5, 2.6, 2.11 */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Security Rules</h3>
          <p style={{ ...mutedStyle, marginBottom: "12px" }}>
            Read each rule and check the box to acknowledge it.
          </p>
          <ul
            style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}
          >
            {ACKNOWLEDGMENTS.map((text, i) => (
              <li key={i}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    // Meets 44×44 touch target (Req 2.11)
                    minHeight: "44px",
                    padding: "4px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => toggle(i)}
                    style={{
                      width: "20px",
                      height: "20px",
                      accentColor: "var(--color-accent-blue, #4f8ef7)",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                    aria-label={text}
                  />
                  <span style={{ color: "var(--color-text-primary)", fontSize: "0.9rem", lineHeight: 1.4 }}>
                    {text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Guidelines — Requirement 2.3 */}
        <div style={cardStyle}>
          <h3 style={headingStyle}>Guidelines</h3>
          <ul style={{ ...mutedStyle, paddingLeft: "18px", margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>This exam consists of {test.questionCount} multiple-choice questions (MCQ).</li>
            <li>Each question carries a fixed number of marks.</li>
            <li>There is no negative marking for wrong answers.</li>
            <li>Total marks: {test.totalMarks}. Duration: {test.duration} minutes.</li>
            <li>Your answers are saved automatically as you progress.</li>
          </ul>
        </div>
      </div>

      {/* Start Exam button — pinned via FixedActionBar (Req 2.9, 2.10) */}
      <FixedActionBar>
        <button
          onClick={handleStart}
          disabled={!allChecked || !attemptId}
          style={{
            flex: 1,
            padding: "14px",
            minHeight: "44px",
            background: allChecked && attemptId ? "var(--gradient-primary)" : "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "10px",
            color: allChecked && attemptId ? "white" : "var(--color-text-secondary)",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: allChecked && attemptId ? "pointer" : "not-allowed",
            transition: "background 0.15s, color 0.15s",
            boxShadow: allChecked && attemptId ? "0 4px 16px rgba(79, 142, 247, 0.3)" : "none",
          }}
          aria-disabled={!allChecked || !attemptId}
        >
          {allChecked ? "Start Exam →" : `Check all ${ACKNOWLEDGMENTS.length} boxes to continue`}
        </button>
      </FixedActionBar>
    </>
  );
}

/** state === "in_progress" — if onNavigate already fired we show a resume option */
function LobbyInProgress({
  attemptId,
  onStartExam,
}: {
  attemptId: string | null;
  onStartExam: (id: string) => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📖</div>
      <h2
        className="gradient-text"
        style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}
      >
        Exam is already in progress
      </h2>
      <p style={{ ...mutedStyle, marginBottom: "24px" }}>
        You have an existing attempt for this exam.
      </p>
      {attemptId && (
        <button
          onClick={() => onStartExam(attemptId)}
          style={{
            padding: "14px 28px",
            minHeight: "44px",
            minWidth: "44px",
            background: "var(--gradient-primary)",
            border: "none",
            borderRadius: "10px",
            color: "white",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(79, 142, 247, 0.3)",
          }}
        >
          Resume Exam →
        </button>
      )}
    </div>
  );
}

/** state === "finished" */
function LobbyFinished({
  attempt,
}: {
  attempt: {
    score: number | null;
    totalMarks: number | null;
    correctCount: number | null;
    answeredCount: number | null;
  } | null;
}) {
  const score = attempt?.score ?? null;
  const totalMarks = attempt?.totalMarks ?? null;
  const correctCount = attempt?.correctCount ?? null;
  const answeredCount = attempt?.answeredCount ?? null;

  const percentage =
    score !== null && totalMarks !== null ? computePercentage(score, totalMarks) : null;

  if (attempt === null) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>✅</div>
        <h2
          className="gradient-text"
          style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}
        >
          You have completed this exam.
        </h2>
        <p style={{ ...mutedStyle, color: "#f87171" }}>
          Results could not be loaded. Please contact your examiner.
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
      <h2
        className="gradient-text"
        style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}
      >
        You have completed this exam.
      </h2>

      <div
        style={{
          ...cardStyle,
          maxWidth: "360px",
          margin: "20px auto 0",
          textAlign: "left",
        }}
      >
        <h3 style={headingStyle}>Your Results</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {percentage !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={mutedStyle}>Percentage</span>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 700, fontSize: "1.1rem" }}>
                {percentage}%
              </span>
            </div>
          )}
          {score !== null && totalMarks !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={mutedStyle}>Score</span>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                {score} / {totalMarks}
              </span>
            </div>
          )}
          {correctCount !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={mutedStyle}>Correct answers</span>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                {correctCount}
              </span>
            </div>
          )}
          {answeredCount !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={mutedStyle}>Questions answered</span>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                {answeredCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** state === "ended" */
function LobbyEnded({ title }: { title: string | null }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🔒</div>
      <h2
        className="gradient-text"
        style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}
      >
        This exam has ended.
      </h2>
      {title && (
        <p style={mutedStyle}>
          <strong style={{ color: "var(--color-text-primary)" }}>{title}</strong> is no longer
          accepting participants.
        </p>
      )}
      <p style={{ ...mutedStyle, marginTop: "8px" }}>
        The exam session is closed. Please contact your examiner if you believe this is an error.
      </p>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

/**
 * LobbyScreen
 *
 * Renders one of 5 state-driven views based on the live lobby state polled
 * from `GET /api/tests/code/:code` via `useLobbyPolling`.
 *
 * Requirements: 2.1–2.11, 3.1–3.6
 */
export default function LobbyScreen({ code, onStartExam }: LobbyScreenProps) {
  const { lobbyState, error, isLoading, isDegraded } = useLobbyPolling({
    code,
    enabled: true,
    onNavigate: onStartExam,
  });

  // ── Full-page loading (first fetch, no data yet) ──────────────────────────
  if (isLoading && !lobbyState) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          minHeight: "200px",
          padding: "32px 16px",
        }}
      >
        <Spinner size={36} />
        <p style={mutedStyle}>Loading exam details…</p>
      </div>
    );
  }

  // ── Error state (no data available) ──────────────────────────────────────
  if (error && !lobbyState) {
    return (
      <div
        role="alert"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚠️</div>
        <p style={{ color: "#f87171", fontWeight: 600, marginBottom: "8px" }}>{error}</p>
        <p style={mutedStyle}>Retrying automatically…</p>
      </div>
    );
  }

  // ── Degraded connectivity indicator ──────────────────────────────────────
  const degradedBanner = isDegraded ? (
    <div
      aria-live="polite"
      style={{
        background: "rgba(251, 191, 36, 0.08)",
        border: "1px solid rgba(251, 191, 36, 0.25)",
        borderRadius: "8px",
        padding: "8px 14px",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.82rem",
        color: "#fbbf24",
      }}
    >
      <span aria-hidden="true">⚡</span>
      Connection issues — retrying…
    </div>
  ) : null;

  // ── Error banner (data still available from last good poll) ──────────────
  const errorBanner =
    error && lobbyState ? (
      <div
        role="alert"
        aria-live="polite"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "8px",
          padding: "8px 14px",
          marginBottom: "12px",
          fontSize: "0.82rem",
          color: "#f87171",
        }}
      >
        {error}
      </div>
    ) : null;

  // ── State-specific content ────────────────────────────────────────────────
  let content: React.ReactNode = null;

  if (!lobbyState) {
    // Shouldn't normally reach here, but guard gracefully.
    content = (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <Spinner />
      </div>
    );
  } else {
    const { state, test, attempt } = lobbyState;

    switch (state) {
      case "waiting":
        content = <LobbyWaiting test={test} />;
        break;

      case "ready":
        content = (
          <LobbyReady
            test={test}
            onStartExam={onStartExam}
            attemptId={attempt?.id ?? null}
          />
        );
        break;

      case "in_progress":
        // onNavigate already fires via useLobbyPolling when polling detects
        // in_progress; this view is shown if the component hasn't unmounted yet.
        content = (
          <LobbyInProgress
            attemptId={attempt?.id ?? null}
            onStartExam={onStartExam}
          />
        );
        break;

      case "finished":
        content = <LobbyFinished attempt={attempt} />;
        break;

      case "ended":
        content = <LobbyEnded title={test?.title ?? null} />;
        break;

      default:
        content = null;
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "640px", margin: "0 auto", padding: "0 0 8px" }}>
      {degradedBanner}
      {errorBanner}
      {content}
    </div>
  );
}
