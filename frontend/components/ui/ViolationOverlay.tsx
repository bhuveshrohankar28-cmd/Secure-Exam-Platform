"use client";

type ViolationType =
  | "tab_switch"
  | "window_blur"
  | "visibility_hidden"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu"
  | "keyboard_shortcut";

interface ViolationOverlayProps {
  isVisible: boolean;
  violationType: ViolationType | null;
  onAcknowledge: () => void;
}

function getViolationDescription(type: ViolationType | null): string {
  switch (type) {
    case "tab_switch":
    case "window_blur":
    case "visibility_hidden":
      return "You navigated away from the exam. Please stay on this tab.";
    case "fullscreen_exit":
      return "You exited fullscreen mode. Please remain in fullscreen during the exam.";
    case "copy_attempt":
    case "paste_attempt":
      return "Copy/paste is not allowed during the exam.";
    case "context_menu":
      return "Right-click is not allowed during the exam.";
    case "keyboard_shortcut":
      return "That keyboard shortcut is not allowed during the exam.";
    default:
      return "A security violation was detected. Please follow exam rules.";
  }
}

export function ViolationOverlay({
  isVisible,
  violationType,
  onAcknowledge,
}: ViolationOverlayProps) {
  if (!isVisible) return null;

  const description = getViolationDescription(violationType);
  const titleId = "violation-overlay-title";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          background: "var(--color-bg-secondary, #1a1a2e)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "16px",
          padding: "36px 28px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⚠️</div>

        <h2
          id={titleId}
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#f87171",
            margin: "0 0 14px",
          }}
        >
          Exam Integrity Warning
        </h2>

        <p
          style={{
            color: "var(--color-text-secondary, rgba(255,255,255,0.7))",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          {description}
        </p>

        <button
          type="button"
          onClick={onAcknowledge}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            padding: "12px 32px",
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
          I Understand
        </button>
      </div>
    </div>
  );
}
