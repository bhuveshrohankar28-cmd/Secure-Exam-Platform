"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, testsApi } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/api/client";
import { validateLobbyEntry } from "@/lib/utils/validation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-text-primary)",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
  minHeight: "44px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "var(--color-text-secondary)",
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
};

const fieldErrorStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#f87171",
  marginTop: "6px",
};

export default function LobbyEntryForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation before any network request (Requirements 1.2, 1.3, 1.4, 1.9)
    const errors = validateLobbyEntry(username, code);
    setUsernameError(errors.usernameError ?? null);
    setCodeError(errors.codeError ?? null);
    setApiError(null);

    if (errors.usernameError || errors.codeError) {
      return;
    }

    setLoading(true);

    try {
      // Step 1: Authenticate the student (Requirement 1.5)
      const authResult = await authApi.login(username.trim());

      if (!authResult.success) {
        // Requirement 1.6 — retain field values, show error
        setApiError(
          authResult.error || "Authentication failed. Please check your username and try again."
        );
        setLoading(false);
        return;
      }

      const token =
        authResult.data?.token ||
        (authResult as unknown as { token?: string }).token;
      const user =
        authResult.data?.user ||
        (authResult as unknown as { user?: { role?: string } }).user;

      if (!token) {
        setApiError("Authentication failed. No token received.");
        setLoading(false);
        return;
      }

      setAuthToken(token);
      if (typeof window !== "undefined" && user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      // Step 2: Look up the test by code (Requirement 1.5)
      const lobbyResult = await testsApi.getLobby(code.trim());

      if (!lobbyResult.success) {
        // Requirement 1.7 — retain field values, show error
        setApiError(
          lobbyResult.error || "Test code not found. Please check the code and try again."
        );
        setLoading(false);
        return;
      }

      // Navigate to the lobby screen with the test code
      // The full lobby screen (LobbyScreen) is implemented in task 8.4.
      // For now, navigate to the student tests page which renders the lobby state.
      router.push(`/student/tests/${encodeURIComponent(code.trim())}`);
    } catch {
      setApiError("Unable to connect to the server. Please try again.");
      setLoading(false);
    }
  }

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
      <div
        className="glass-card"
        style={{ padding: "36px 30px", width: "100%", maxWidth: "480px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "6px" }}>📋</div>
          <h1
            className="gradient-text"
            style={{ fontSize: "1.75rem", fontWeight: 800 }}
          >
            Enter Exam Lobby
          </h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              marginTop: "6px",
              fontSize: "0.88rem",
            }}
          >
            Enter your username and the test code to access the exam lobby
          </p>
        </div>

        {/* Global API error (Requirement 1.6, 1.7) */}
        {apiError && (
          <div
            role="alert"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
              color: "#f87171",
              fontSize: "0.85rem",
            }}
          >
            {apiError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Username field (Requirement 1.1 — max 100 chars) */}
          <div>
            <label htmlFor="lobby-username" style={labelStyle}>
              Username
            </label>
            <input
              id="lobby-username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError(null);
              }}
              disabled={loading}
              autoFocus
              autoCorrect="off"
              autoCapitalize="off"
              maxLength={101} /* allow typing to trigger validation message */
              aria-describedby={usernameError ? "lobby-username-error" : undefined}
              aria-invalid={usernameError ? "true" : undefined}
              style={{
                ...inputStyle,
                borderColor: usernameError
                  ? "rgba(239, 68, 68, 0.6)"
                  : "var(--color-border)",
              }}
            />
            {/* Field-level error (Requirements 1.3, 1.9) */}
            {usernameError && (
              <p id="lobby-username-error" style={fieldErrorStyle} role="alert">
                {usernameError}
              </p>
            )}
          </div>

          {/* Test Code field (Requirement 1.1 — max 50 chars) */}
          <div>
            <label htmlFor="lobby-code" style={labelStyle}>
              Test Code
            </label>
            <input
              id="lobby-code"
              type="text"
              placeholder="e.g. EXAM2026"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (codeError) setCodeError(null);
              }}
              disabled={loading}
              autoCapitalize="characters"
              autoCorrect="off"
              maxLength={51} /* allow typing to trigger validation message */
              aria-describedby={codeError ? "lobby-code-error" : undefined}
              aria-invalid={codeError ? "true" : undefined}
              style={{
                ...inputStyle,
                letterSpacing: "0.04em",
                fontFamily: "monospace",
                fontWeight: 600,
                borderColor: codeError
                  ? "rgba(239, 68, 68, 0.6)"
                  : "var(--color-border)",
              }}
            />
            {/* Field-level error (Requirements 1.4, 1.9) */}
            {codeError && (
              <p id="lobby-code-error" style={fieldErrorStyle} role="alert">
                {codeError}
              </p>
            )}
          </div>

          {/* Submit button (Requirements 1.8, 1.11, 1.12 — full-width, min 44px) */}
          <button
            id="lobby-submit"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              minHeight: "44px",
              background: "var(--gradient-primary)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "4px",
              boxShadow: "0 4px 16px rgba(79, 142, 247, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {/* Loading indicator (Requirement 1.8) */}
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Entering Lobby…
              </>
            ) : (
              "Enter Lobby →"
            )}
          </button>
        </form>
      </div>

      {/* Keyframe for the spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
