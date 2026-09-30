import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your student account",
};

export default function RegisterPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--gradient-hero)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div className="glass-card" style={{ padding: "40px 32px", width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "2.5rem" }}>📝</span>
          <h1
            className="gradient-text"
            style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "12px" }}
          >
            Create Account
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "8px", fontSize: "0.9rem" }}>
            Register as a student
          </p>
        </div>

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
          🚧 <strong>Phase 2:</strong> Student registration with email, enrollment number,
          branch, domain, and year of passing.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {["Full Name", "Email", "College Enrollment No.", "Branch", "Domain", "Year of Passing", "Phone"].map(
            (field) => (
              <div key={field}>
                <label
                  style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "5px" }}
                >
                  {field}
                </label>
                <input
                  disabled
                  placeholder={`Enter ${field.toLowerCase()}`}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text-primary)",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>
            )
          )}

          <button
            id="register-submit"
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
              marginTop: "8px",
            }}
          >
            Create Account
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          Already registered?{" "}
          <a href="/login" style={{ color: "#4f8ef7", textDecoration: "none", fontWeight: 600 }}>
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
