import type { Metadata } from "next";

export const metadata: Metadata = { title: "Test Instructions" };

export default async function TestInstructionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div className="glass-card" style={{ padding: "40px 32px", width: "100%", maxWidth: "520px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px" }}>
          Test Instructions
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px", fontSize: "0.9rem" }}>
          Test ID: <code style={{ color: "#4f8ef7" }}>{id}</code>
        </p>

        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            fontSize: "0.85rem",
            color: "#f59e0b",
          }}
        >
          🚧 <strong>Phase 7:</strong> Full exam interface with timer, question navigation,
          autosave, and anti-cheating detection will be implemented here.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {[
            "This test is MCQ-based.",
            "Once started, the timer cannot be paused.",
            "Tab switching and window blur events are monitored.",
            "Your answers are autosaved periodically.",
            "Submit before the timer expires.",
          ].map((instruction, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "10px",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ color: "#4f8ef7", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ color: "var(--color-text-secondary)" }}>{instruction}</span>
            </div>
          ))}
        </div>

        <button
          id={`exam-start-btn-${id}`}
          disabled
          style={{
            width: "100%",
            padding: "14px",
            background: "var(--gradient-primary)",
            border: "none",
            borderRadius: "10px",
            color: "white",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          Start Exam (Phase 7)
        </button>
      </div>
    </main>
  );
}
