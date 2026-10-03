"use client";

export interface StickyTimerBarProps {
  remainingMs: number;
  formattedTime: string;
  colorState: "default" | "warning" | "critical";
}

const COLOR_MAP: Record<StickyTimerBarProps["colorState"], string> = {
  default: "var(--color-text-primary)",
  warning: "#f59e0b",
  critical: "#ef4444",
};

export function StickyTimerBar({
  remainingMs: _remainingMs,
  formattedTime,
  colorState,
}: StickyTimerBarProps) {
  const color = COLOR_MAP[colorState];
  const isCritical = colorState === "critical";

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div
        role="timer"
        aria-live="polite"
        aria-label="Time remaining"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 16px",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color,
            animation: isCritical ? "pulse 1s infinite" : undefined,
          }}
        >
          {formattedTime}
        </span>
      </div>
    </>
  );
}
