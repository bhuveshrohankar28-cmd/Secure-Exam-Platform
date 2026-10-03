"use client";

export interface QuestionCardQuestion {
  id: string;
  text: string;
  options: string[];
  marks: number;
  order: number;
}

export interface QuestionCardProps {
  question: QuestionCardQuestion;
  selectedOptionIndex: number | null;
  isMarkedForReview: boolean;
  onSelectOption: (index: number) => void;
  onToggleReview: () => void;
  totalQuestions: number;
}

/**
 * QuestionCard — renders a single exam question with radio-button options.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.6, 15.8, 15.9, 15.10, 15.11
 * ARIA: role="radiogroup" on options container; each option role="radio" + aria-checked.
 *       aria-live="polite" region announces selection changes (Req 20.8).
 */
export function QuestionCard({
  question,
  selectedOptionIndex,
  isMarkedForReview,
  onSelectOption,
  onToggleReview,
  totalQuestions,
}: QuestionCardProps) {
  const { id, text, options, marks, order } = question;
  const marksLabel = `(${marks} mark${marks !== 1 ? "s" : ""})`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
      }}
    >
      {/* ── Question header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Question {order} of {totalQuestions}
          </span>
          {/* Marks badge */}
          <span
            style={{
              display: "inline-block",
              background: "rgba(79, 142, 247, 0.12)",
              color: "var(--color-accent-blue, #4f8ef7)",
              border: "1px solid rgba(79, 142, 247, 0.25)",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "0.75rem",
              fontWeight: 700,
              lineHeight: "1.4",
              width: "fit-content",
            }}
            aria-label={`Worth ${marks} mark${marks !== 1 ? "s" : ""}`}
          >
            {marksLabel}
          </span>
        </div>

        {/* ── Mark for Review toggle ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={onToggleReview}
          aria-pressed={isMarkedForReview}
          aria-label={
            isMarkedForReview
              ? "Unmark question for review"
              : "Mark question for review"
          }
          style={{
            /* Minimum 44×44 px touch target (Req 15.15) */
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "6px 12px",
            background: isMarkedForReview
              ? "rgba(245, 158, 11, 0.15)"
              : "rgba(255, 255, 255, 0.05)",
            border: isMarkedForReview
              ? "1.5px solid rgba(245, 158, 11, 0.6)"
              : "1.5px solid var(--color-border)",
            borderRadius: "8px",
            color: isMarkedForReview
              ? "#f59e0b"
              : "var(--color-text-secondary)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
          }}
        >
          {/* Flag icon — distinct amber when marked (not color alone: border + bg change too) */}
          <span aria-hidden="true">{isMarkedForReview ? "🚩" : "🏳️"}</span>
          <span>{isMarkedForReview ? "Marked" : "Mark for Review"}</span>
        </button>
      </div>

      {/* ── Question text ─────────────────────────────────────────────────── */}
      <p
        id={`question-text-${id}`}
        style={{
          margin: 0,
          fontSize: "1rem",
          lineHeight: "1.6",
          color: "var(--color-text-primary)",
          fontWeight: 500,
        }}
      >
        {text}
      </p>

      {/* ── Live region for screen-reader selection announcements (Req 20.8) ─ */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {selectedOptionIndex !== null
          ? `Selected option ${selectedOptionIndex + 1} of ${options.length}: ${options[selectedOptionIndex]}`
          : ""}
      </span>

      {/* ── Options ───────────────────────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-labelledby={`question-text-${id}`}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        {options.map((optionText, index) => {
          const isSelected = selectedOptionIndex === index;
          const optionId = `option-${id}-${index}`;

          return (
            <button
              key={optionId}
              id={optionId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${index + 1} of ${options.length}: ${optionText}`}
              onClick={() => onSelectOption(index)}
              style={{
                /* Full-width card, min 48px height (Req 15.10 / 15.13) */
                width: "100%",
                minHeight: "48px",
                /* Minimum 44px touch target (Req 15.15) */
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                background: isSelected
                  ? "rgba(79, 142, 247, 0.15)"
                  : "rgba(255, 255, 255, 0.04)",
                border: isSelected
                  ? "2px solid var(--color-accent-blue, #4f8ef7)"
                  : "1.5px solid var(--color-border)",
                borderRadius: "10px",
                cursor: "pointer",
                color: isSelected
                  ? "var(--color-accent-blue, #4f8ef7)"
                  : "var(--color-text-primary)",
                fontSize: "0.95rem",
                fontWeight: isSelected ? 600 : 400,
                transition:
                  "background 150ms ease, border-color 150ms ease, color 150ms ease",
                outline: "none",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 0 3px rgba(79,142,247,0.35)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
              }}
            >
              {/* Radio indicator circle — visual, not color-alone (shape + fill change) */}
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: isSelected
                    ? "2px solid var(--color-accent-blue, #4f8ef7)"
                    : "2px solid var(--color-border)",
                  background: isSelected
                    ? "var(--color-accent-blue, #4f8ef7)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && (
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "white",
                    }}
                  />
                )}
              </span>

              {/* Option label letter A/B/C/D */}
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: isSelected
                    ? "rgba(79, 142, 247, 0.3)"
                    : "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: isSelected
                    ? "var(--color-accent-blue, #4f8ef7)"
                    : "var(--color-text-secondary)",
                }}
              >
                {String.fromCharCode(65 + index)}
              </span>

              {/* Option text */}
              <span style={{ flex: 1, lineHeight: "1.4" }}>{optionText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
