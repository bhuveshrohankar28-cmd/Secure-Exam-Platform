"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { attemptsApi, ExamSession, AttemptView } from "@/lib/api/endpoints";

type AnswerMap = Record<string, number | null>;

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const attemptId = decodeURIComponent(params.id);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef<AnswerMap>({});
  const savedAnswersRef = useRef<AnswerMap>({});
  const savingRef = useRef(false);
  const submittingRef = useRef(false);
  const deadlineRef = useRef(0);
  const submitRef = useRef<() => Promise<void>>(async () => {});

  const submitExam = useCallback(async () => {
    if (submittingRef.current || !session) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    const payload = Object.entries(answersRef.current).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }));
    const response = await attemptsApi.submit(attemptId, payload);
    if (response.success && response.data?.attempt) {
      setResult(response.data.attempt);
    } else {
      setError(response.error || "Could not submit your exam. Please retry.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, session]);
  useEffect(() => {
    submitRef.current = submitExam;
  }, [submitExam]);

  useEffect(() => {
    let active = true;
    attemptsApi.getById(attemptId).then((response) => {
      if (!active) return;
      if (!response.success || !response.data) {
        setError(response.error || "Could not load this exam.");
        return;
      }
      if (!("questions" in response.data)) {
        router.replace("/student/results");
        return;
      }
      const loaded = response.data;
      const initialAnswers = loaded.answers || {};
      setSession(loaded);
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      savedAnswersRef.current = { ...initialAnswers };
      deadlineRef.current = Date.now() + loaded.remainingMs;
      setRemainingMs(loaded.remainingMs);
    }).catch((loadError: unknown) => {
      console.error("[Exam] Failed to load session:", loadError);
      if (active) setError("Could not load this exam. Please try again.");
    });
    return () => { active = false; };
  }, [attemptId, router]);

  useEffect(() => {
    if (!session || result) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) void submitRef.current();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session, result]);

  useEffect(() => {
    if (!session || result || Object.keys(answers).length === 0) return;
    const hasChanges = Object.entries(answers).some(
      ([id, value]) => savedAnswersRef.current[id] !== value
    );
    if (!hasChanges) return;

    const timeout = window.setTimeout(async () => {
      if (savingRef.current || submittingRef.current) return;
      const changed = Object.entries(answersRef.current)
        .filter(([id, value]) => savedAnswersRef.current[id] !== value)
        .map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex }));
      if (changed.length === 0) return;
      savingRef.current = true;
      setSaving(true);
      const response = await attemptsApi.saveAnswers(attemptId, changed);
      if (response.success) {
        changed.forEach(({ questionId, selectedOptionIndex }) => {
          savedAnswersRef.current[questionId] = selectedOptionIndex;
        });
        setError(null);
      } else {
        setError(response.error || "An answer could not be saved. It will retry after your next change.");
      }
      savingRef.current = false;
      setSaving(false);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [answers, attemptId, result, session]);

  function chooseAnswer(questionId: string, selectedOptionIndex: number) {
    const next = { ...answersRef.current, [questionId]: selectedOptionIndex };
    answersRef.current = next;
    setAnswers(next);
  }

  function clearAnswer(questionId: string) {
    const next = { ...answersRef.current, [questionId]: null };
    answersRef.current = next;
    setAnswers(next);
  }

  if (result) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--color-bg-primary)", display: "grid", placeItems: "center", padding: "24px" }}>
        <section className="glass-card" style={{ width: "100%", maxWidth: "520px", padding: "36px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>✅</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "12px 0" }}>Exam submitted</h1>
          <p style={{ color: "var(--color-text-secondary)" }}>{result.testTitle}</p>
          <p style={{ fontSize: "2rem", fontWeight: 800, color: "#4f8ef7", margin: "18px 0" }}>{result.score ?? 0} / {result.totalMarks ?? 0}</p>
          <p style={{ color: "var(--color-text-secondary)" }}>Correct answers: {result.correctCount ?? 0} · Answered: {result.answeredCount ?? 0}</p>
          <Link href="/student/results" style={{ display: "inline-block", marginTop: "24px", padding: "12px 18px", borderRadius: "8px", color: "#fff", background: "var(--gradient-primary)", textDecoration: "none" }}>View all results</Link>
        </section>
      </main>
    );
  }

  if (!session) {
    return <main style={{ minHeight: "100vh", background: "var(--color-bg-primary)", padding: "48px 24px" }}>{error ? <p role="alert" style={{ color: "#f87171" }}>{error}</p> : <p style={{ color: "var(--color-text-secondary)" }}>Loading exam session…</p>}<Link href="/student/dashboard" style={{ display: "inline-block", marginTop: "20px", color: "#4f8ef7" }}>Return to dashboard</Link></main>;
  }

  const question = session.questions[currentQuestion];
  const selected = question ? answers[question.id] : undefined;
  const answeredCount = session.questions.filter(
    (item) => answers[item.id] !== undefined && answers[item.id] !== null
  ).length;

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "16px 24px", background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
        <div><strong>{session.test.title}</strong><div style={{ color: "var(--color-text-secondary)", fontSize: ".8rem", marginTop: "4px" }}>Question {currentQuestion + 1} of {session.questions.length}</div></div>
        <div style={{ textAlign: "right" }}><strong style={{ fontSize: "1.25rem", color: remainingMs < 60_000 ? "#f87171" : "#4f8ef7", fontVariantNumeric: "tabular-nums" }}>{formatTime(remainingMs)}</strong><div aria-live="polite" style={{ color: "var(--color-text-secondary)", fontSize: ".78rem" }}>{submitting ? "Submitting…" : saving ? "Saving…" : "Saved"}</div></div>
      </header>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "28px 18px" }}>
        {error && <div role="alert" style={{ padding: "12px 16px", marginBottom: "16px", borderRadius: "8px", background: "rgba(239,68,68,.12)", color: "#f87171" }}>{error}</div>}
        <section className="glass-card" style={{ padding: "26px", marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)", fontSize: ".85rem", marginBottom: "14px" }}><span>Question {currentQuestion + 1}</span><span>{question.marks} mark{question.marks === 1 ? "" : "s"}</span></div>
          <h1 style={{ fontSize: "1.2rem", lineHeight: 1.55, fontWeight: 700, marginBottom: "22px" }}>{question.text}</h1>
          <div role="radiogroup" aria-label={`Answer for question ${currentQuestion + 1}`} style={{ display: "grid", gap: "10px" }}>
            {question.options.map((option, index) => (
              <label key={`${question.id}-${index}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", border: `1px solid ${selected === index ? "#4f8ef7" : "var(--color-border)"}`, borderRadius: "9px", background: selected === index ? "rgba(79,142,247,.12)" : "transparent", cursor: "pointer" }}>
                <input type="radio" name={question.id} checked={selected === index} onChange={() => chooseAnswer(question.id, index)} />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {selected !== undefined && <button onClick={() => clearAnswer(question.id)} style={{ marginTop: "14px", border: 0, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Clear answer</button>}
        </section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: ".85rem" }}>{answeredCount} of {session.questions.length} answered</span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((value) => value - 1)} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", background: "transparent", cursor: currentQuestion === 0 ? "not-allowed" : "pointer", opacity: currentQuestion === 0 ? .5 : 1 }}>Previous</button>
            {currentQuestion < session.questions.length - 1 ? (
              <button onClick={() => setCurrentQuestion((value) => value + 1)} style={{ padding: "10px 16px", borderRadius: "8px", border: 0, color: "#fff", background: "var(--gradient-primary)", cursor: "pointer" }}>Next question</button>
            ) : (
              <button disabled={submitting} onClick={() => void submitExam()} style={{ padding: "10px 16px", borderRadius: "8px", border: 0, color: "#fff", background: "#10b981", cursor: submitting ? "wait" : "pointer" }}>{submitting ? "Submitting…" : "Submit exam"}</button>
            )}
          </div>
        </div>
        <nav aria-label="Question navigation" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "22px" }}>
          {session.questions.map((item, index) => <button key={item.id} aria-label={`Go to question ${index + 1}`} aria-current={index === currentQuestion ? "step" : undefined} onClick={() => setCurrentQuestion(index)} style={{ width: "38px", height: "38px", borderRadius: "8px", border: `1px solid ${index === currentQuestion ? "#4f8ef7" : "var(--color-border)"}`, background: answers[item.id] !== undefined ? "rgba(16,185,129,.2)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>{index + 1}</button>)}
        </nav>
      </div>
    </main>
  );
}
