"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";

export interface SubmitConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
  /** While submit is in flight */
  isSubmitting?: boolean;
  /** Error from a failed submission attempt */
  error?: string | null;
}

/**
 * SubmitConfirmationDialog
 *
 * Shows a summary of the student's exam state (answered, unanswered, marked)
 * before asking for final submission confirmation.
 *
 * - Mobile  (≤767px): rendered as a full-screen-height BottomSheet.
 * - Desktop (≥768px): centered modal overlay.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10
 */
export function SubmitConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  answeredCount,
  unansweredCount,
  markedCount,
  isSubmitting = false,
  error = null,
}: SubmitConfirmationDialogProps) {
  // ── Shared content ──────────────────────────────────────────────────────────
  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Summary rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "16px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "10px",
          border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
        }}
      >
        <SummaryRow
          emoji="✅"
          label="Answered"
          count={answeredCount}
          color="#4ade80"
        />
        <SummaryRow
          emoji="⬜"
          label="Unanswered"
          count={unansweredCount}
          color="var(--color-text-secondary, #9ca3af)"
        />
        <SummaryRow
          emoji="🚩"
          label="Marked for review"
          count={markedCount}
          color="#fbbf24"
        />
      </div>

      {unansweredCount > 0 && (
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "#f87171",
            lineHeight: 1.5,
          }}
        >
          You have {unansweredCount} unanswered question
          {unansweredCount !== 1 ? "s" : ""}. Are you sure you want to submit?
        </p>
      )}

      {/* Inline error (e.g. network failure on submit) */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
            color: "#f87171",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Confirm — receives initial focus via autoFocus */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          style={{
            minHeight: 44,
            width: "100%",
            padding: "12px 24px",
            background: "var(--gradient-primary, #4f8ef7)",
            border: "none",
            borderRadius: "10px",
            color: "white",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: isSubmitting ? "wait" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Submitting…" : "Submit Exam"}
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            minHeight: 44,
            width: "100%",
            padding: "12px 24px",
            background: "transparent",
            border: "1.5px solid var(--color-border, rgba(255,255,255,0.15))",
            borderRadius: "10px",
            color: "var(--color-text-secondary, #9ca3af)",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Mobile: BottomSheet ─────────────────────────────────────────────────────
  // ── Desktop: centered modal overlay ────────────────────────────────────────
  return (
    <>
      {/* Mobile BottomSheet (visible at ≤767px) */}
      <div className="submit-dialog-mobile">
        <BottomSheet
          isOpen={isOpen}
          onClose={onCancel}
          title="Submit Exam?"
        >
          {content}
        </BottomSheet>
      </div>

      {/* Desktop modal (visible at ≥768px) */}
      {isOpen && (
        <div className="submit-dialog-desktop">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Submit Exam?"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              padding: "24px 16px",
            }}
            // Close on backdrop click
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) onCancel();
            }}
          >
            <div
              style={{
                background: "var(--color-bg-secondary, #1e1e2e)",
                border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                borderRadius: "16px",
                padding: "28px 24px",
                maxWidth: "440px",
                width: "100%",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 20px",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                }}
              >
                Submit Exam?
              </h2>
              {content}
            </div>
          </div>
        </div>
      )}

      {/* Responsive visibility rules */}
      <style>{`
        .submit-dialog-mobile  { display: block; }
        .submit-dialog-desktop { display: none;  }

        @media (min-width: 768px) {
          .submit-dialog-mobile  { display: none;  }
          .submit-dialog-desktop { display: block; }
        }
      `}</style>
    </>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function SummaryRow({
  emoji,
  label,
  count,
  color,
}: {
  emoji: string;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span aria-hidden="true">{emoji}</span>
        <span
          style={{
            fontSize: "0.9rem",
            color: "var(--color-text-secondary, #9ca3af)",
          }}
        >
          {label}
        </span>
      </span>
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
    </div>
  );
}
