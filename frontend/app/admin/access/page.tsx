"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, testAccessApi } from "@/lib/api/endpoints";
import { Test, TestAccess, User } from "@/types";

const navItems = [
  ["Dashboard", "/admin/dashboard"], ["Users", "/admin/users"], ["Tests", "/admin/tests"],
  ["Test Access", "/admin/access"], ["Attempts", "/admin/attempts"], ["Reports", "/admin/reports"],
];
const inputStyle: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "8px",
  background: "var(--color-bg-primary)", color: "var(--color-text-primary)",
};

export default function AdminAccessPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [records, setRecords] = useState<TestAccess[]>([]);
  const [testId, setTestId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadData() {
    const [testResponse, userResponse, accessResponse] = await Promise.all([
      adminApi.getTests(), adminApi.getUsers(), testAccessApi.getAll(),
    ]);
    const errors = [testResponse, userResponse, accessResponse].filter((response) => !response.success);
    if (errors.length > 0) {
      setError(errors.map((response) => response.error).filter(Boolean).join(" "));
    } else {
      const loadedTests = Array.isArray(testResponse.data) ? testResponse.data : [];
      const loadedUsers = Array.isArray(userResponse.data) ? userResponse.data.filter((user) => user.role === "student") : [];
      setTests(loadedTests);
      setStudents(loadedUsers);
      setRecords(Array.isArray(accessResponse.data) ? accessResponse.data : []);
      setTestId((current) => current || loadedTests[0]?.id || "");
      setUserId((current) => current || loadedUsers[0]?.id || "");
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.getTests(), adminApi.getUsers(), testAccessApi.getAll()]).then(
      ([testResponse, userResponse, accessResponse]) => {
        if (!active) return;
        const errors = [testResponse, userResponse, accessResponse].filter((response) => !response.success);
        if (errors.length > 0) {
          setError(errors.map((response) => response.error).filter(Boolean).join(" "));
        } else {
          const loadedTests = Array.isArray(testResponse.data) ? testResponse.data : [];
          const loadedUsers = Array.isArray(userResponse.data) ? userResponse.data.filter((user) => user.role === "student") : [];
          setTests(loadedTests);
          setStudents(loadedUsers);
          setRecords(Array.isArray(accessResponse.data) ? accessResponse.data : []);
          setTestId((current) => current || loadedTests[0]?.id || "");
          setUserId((current) => current || loadedUsers[0]?.id || "");
        }
        setLoading(false);
      }
    );
    return () => { active = false; };
  }, []);

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!testId || !userId) return;
    setBusy(true);
    setError(null);
    const response = await testAccessApi.grant(testId, userId);
    if (response.success) {
      setNotice("Test access granted.");
      await loadData();
    } else setError(response.error || "Could not grant test access.");
    setBusy(false);
  }

  async function revoke(record: TestAccess) {
    setBusy(true);
    setError(null);
    const response = await testAccessApi.revoke(record.id);
    if (response.success) {
      setNotice("Test access revoked.");
      await loadData();
    } else setError(response.error || "Could not revoke test access.");
    setBusy(false);
  }

  const testName = (id: string) => tests.find((test) => test.id === id)?.title || id;
  const studentName = (id: string) => {
    const user = students.find((student) => student.id === id);
    return user ? `${user.name} (${user.username})` : id;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <aside style={{ width: "220px", background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 12px" }}>
        <strong style={{ display: "block", padding: "0 8px 20px" }}>Admin Panel</strong>
        <nav style={{ display: "grid", gap: "4px" }}>{navItems.map(([label, href]) => <Link key={href} href={href} style={{ padding: "10px", borderRadius: "8px", textDecoration: "none", color: href === "/admin/access" ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: href === "/admin/access" ? "rgba(79,142,247,.1)" : "transparent" }}>{label}</Link>)}</nav>
      </aside>
      <main style={{ flex: 1, padding: "30px", overflow: "auto" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Test Access Management</h1>
        <p style={{ color: "var(--color-text-secondary)", margin: "6px 0 20px" }}>Grant or revoke access for an individual student.</p>
        {error && <div role="alert" style={{ padding: "12px", marginBottom: "14px", borderRadius: "8px", color: "#f87171", background: "rgba(239,68,68,.12)" }}>{error}</div>}
        {notice && <div role="status" style={{ padding: "12px", marginBottom: "14px", borderRadius: "8px", color: "#34d399", background: "rgba(16,185,129,.12)" }}>{notice}</div>}
        <section className="glass-card" style={{ padding: "22px", marginBottom: "22px" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "14px" }}>Grant access</h2>
          <form onSubmit={grant} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <select aria-label="Select test" required value={testId} onChange={(event) => setTestId(event.target.value)} style={{ ...inputStyle, flex: "1 1 220px" }}>
              <option value="">Select test…</option>{tests.map((test) => <option key={test.id} value={test.id}>{test.title}</option>)}
            </select>
            <select aria-label="Select student" required value={userId} onChange={(event) => setUserId(event.target.value)} style={{ ...inputStyle, flex: "1 1 220px" }}>
              <option value="">Select student…</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} ({student.username})</option>)}
            </select>
            <button disabled={busy || !testId || !userId} type="submit" style={{ padding: "10px 18px", border: 0, borderRadius: "8px", color: "#fff", background: "var(--gradient-primary)", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>Grant access</button>
          </form>
        </section>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "12px" }}>Access records</h2>
        {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading access records…</p> : records.length === 0 ? <div className="glass-card" style={{ padding: "24px", color: "var(--color-text-secondary)" }}>No test access records yet.</div> : (
          <div className="glass-card" style={{ padding: "12px", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", textAlign: "left" }}>
              <thead><tr style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{["Test", "Student", "Status", "Granted"].map((heading) => <th key={heading} style={{ padding: "12px" }}>{heading}</th>)}<th style={{ padding: "12px" }}>Action</th></tr></thead>
              <tbody>{records.map((record) => <tr key={record.id} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <td style={{ padding: "12px" }}>{testName(record.testId)}</td><td style={{ padding: "12px" }}>{studentName(record.userId)}</td><td style={{ padding: "12px" }}>{record.status}</td><td style={{ padding: "12px" }}>{new Date(record.grantedAt).toLocaleString()}</td>
                <td style={{ padding: "12px" }}>{record.status === "allowed" ? <button disabled={busy} onClick={() => void revoke(record)} style={{ padding: "7px 10px", border: "1px solid rgba(239,68,68,.4)", borderRadius: "7px", color: "#f87171", background: "transparent", cursor: "pointer" }}>Revoke</button> : "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
