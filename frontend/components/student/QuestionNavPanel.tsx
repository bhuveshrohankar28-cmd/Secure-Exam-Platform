"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { questionNavState } from "@/lib/utils/exam";

export interface QuestionNavPanelProps {
  questions: Array<{ id: string; order: number }>;
  answers: Record<string, number | null>;
  markedForReview: Set<string>;
  currentQuestionId: string;
  onNavigate: (questionId: string) => void;
  /** Mobile: rendered inside BottomSheet. Desktop: sidebar. */
  isMobile?: boolean;
  /** For BottomSheet on mobile — controls open/closed state */
  isOpen?: boolean;
  /** For BottomSheet on mobile — called to close the sheet */
  onClose?: () => void;
}

// ── State → visual style map ──────────────────────────────────────────────────

const stateStyles: Record<
  "current" | "marked" | "answered" | "unanswered",
  React.CSSProperties
> = {
  current: {
    background: "rgba(59, 130, 246, 0.25)",
    border: "2px solid #3b82f6",
    color: "#93c5fd",
    fontWeight: 700,
  },
  marked: {
    background: "rgba(245, 158, 11, 0.15)",
    border: "2px solid #f59e0b",
    color: "#fbbf24",
    fontWeight: 600,
  },
  answered: {
    background: "rgba(34, 197, 94, 0.15)",
    border: "2px solid #22c55e",
    color: "#4ade80",
    fontWeight: 600,
  },
  unanswered: {
    background: "rgba(255,255,255,0.04)",
    border: "2px solid rgba(255,255,255,0.12)",
    color: "var(--color-text-secondary, #9ca3af)",
    fontWeight: 400,
  },
};

// ── Grid of nav buttons ───────────────────────────────────────────────────────

function NavGrid({
  questions,
  answers,
  markedForReview,
  currentQuestionId,
  onNavigate,
}: Pick<
  QuestionNavPanelProps,
  "questions" | "answers" | "markedForReview" | "currentQuestionId" | "onNavigate"
>) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
        gap: "8px",
      }}
    >
      {questions.map((q) => {
        const isAnswered =
          answers[q.id] !== null && answers[q.id] !== undefined;
        const navState = questionNavState({
          isCurrent: q.id === currentQuestionId,
          isMarkedForReview: markedForReview.has(q.id),
          isAnswered,
        });

        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onNavigate(q.id)}
            aria-label={`Go to question ${q.order}${navState === "current" ? " (current)" : ""}${navState === "marked" ? " (marked for review)" : ""}${navState === "answered" ? " (answered)" : ""}`}
            aria-current={q.id === currentQuestionId ? "true" : undefined}
            style={{
              // ≥ 44×44 px touch target (WCAG 2.5.5)
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              transition: "opacity 150ms ease, transform 100ms ease",
              padding: 0,
              ...stateStyles[navState],
            }}
          >
            {q.order}
          </button>
        );
      })}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function NavLegend() {
  const items: Array<{ state: keyof typeof stateStyles; label: string }> = [
    { state: "current", label: "Current" },
    { state: "answered", label: "Answered" },
    { state: "marked", label: "Marked" },
    { state: "unanswered", label: "Unanswered" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: "1px solid var(--color-border, rgba(255,255,255,0.1))",
      }}
    >
      {items.map(({ state, label }) => (
        <div
          key={state}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: 3,
              border: stateStyles[state].border as string,
              background: stateStyles[state].background as string,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-secondary, #9ca3af)",
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * QuestionNavPanel
 *
 * - Mobile  (`isMobile={true}`): wraps content in a `BottomSheet`.
 *   Controlled by `isOpen` / `onClose` props.
 * - Desktop (default):          renders as a persistent sidebar panel.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */
export function QuestionNavPanel({
  questions,
  answers,
  markedForReview,
  currentQuestionId,
  onNavigate,
  isMobile = false,
  isOpen = false,
  onClose,
}: QuestionNavPanelProps) {
  const gridProps = {
    questions,
    answers,
    markedForReview,
    currentQuestionId,
    onNavigate,
  };

  // ── Mobile: BottomSheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose ?? (() => {})}
        title="Questions"
      >
        <NavGrid {...gridProps} />
        <NavLegend />
      </BottomSheet>
    );
  }

  // ── Desktop: persistent sidebar ──────────────────────────────────────────
  return (
    <aside
      aria-label="Question navigation"
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--color-bg-secondary, #1e1e2e)",
        border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
        borderRadius: "12px",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        position: "sticky",
        top: 16,
      }}
    >
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "var(--color-text-secondary, #9ca3af)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Questions
      </h2>
      <NavGrid {...gridProps} />
      <NavLegend />
    </aside>
  );
}
