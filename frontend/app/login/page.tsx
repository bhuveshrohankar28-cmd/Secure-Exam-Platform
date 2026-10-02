"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim() || !name.trim()) {
      setError("Please enter your username and full name.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(username.trim(), undefined, name.trim());

      if (response.success && response.data?.token) {
        setAuthToken(response.data.token);

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "user",
            JSON.stringify(response.data.user)
          );
        }

        const role = response.data.user?.role;

        if (role === "admin" || role === "superadmin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      } else {
        setError(response.error || "Login failed. Please check your details.");
      }
    } catch {
      setError(
        "Unable to connect to the examination server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Main Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "42px",
          boxSizing: "border-box",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Heading */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "34px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#174f8f",
              fontSize: "32px",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Examination Portal
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              fontSize: "16px",
              lineHeight: 1.5,
            }}
          >
            Sign in or create an account to access available tests
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <label
              htmlFor="candidate-username"
              style={{
                display: "block",
                marginBottom: "9px",
                color: "#334155",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Username
            </label>

            <input
              id="candidate-username"
              type="text"
              placeholder="Choose or enter a username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              disabled={loading}
              autoFocus
              autoComplete="username"
              style={{
                width: "100%",
                height: "50px",
                padding: "0 15px",
                boxSizing: "border-box",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "16px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label
              htmlFor="candidate-name"
              style={{
                display: "block",
                marginBottom: "9px",
                color: "#334155",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Full Name
            </label>
            <input
              id="candidate-name"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
              style={{
                width: "100%",
                height: "50px",
                padding: "0 15px",
                boxSizing: "border-box",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "16px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "50px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#175a9c",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Signing in..."
              : "Enter Examination Portal"}
          </button>
        </form>

        {/* Security Information */}
        <div
          style={{
            marginTop: "30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              height: "1px",
              width: "100%",
              backgroundColor: "#e5e7eb",
              marginBottom: "20px",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Your data is secure with us.
          </p>
          <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: "14px" }}>
            New here?{" "}
            <Link href="/register" style={{ color: "#175a9c", fontWeight: 600 }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}