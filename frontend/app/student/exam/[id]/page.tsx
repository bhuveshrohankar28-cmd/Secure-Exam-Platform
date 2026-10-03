"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { attemptsApi, ExamSession, AttemptView } from "@/lib/api/endpoints";
import type { ViolationType } from "@/types";
import { computeDialogCounts } from "@/lib/utils/exam";

import { useExamTimer } from "@/hooks/useExamTimer";
import { useViolationDetector } from "@/hooks/useViolationDetector";

import { StickyTimerBar } from "@/components/ui/StickyTimerBar";
import { FixedActionBar } from "@/components/ui/FixedActionBar";
import { FAB } from "@/components/ui/FAB";
import { ViolationOverlay } from "@/components/ui/ViolationOverlay";
import { QuestionCard } from "@/components/student/QuestionCard";
import { QuestionNavPanel } from "@/components/student/QuestionNavPanel";
import { SubmitConfirmationDialog } from "@/components/student/SubmitConfirmationDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnswerMap = Record<string, number | null>;

interface ViolationState {
  isVisible: boolean;
  type: ViolationType | null;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const attemptId = decodeURIComponent(params.id);

  // ── Session & navigation ─────────────────────────────────────────────────
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // ── Answers ─────────────────────────────────────────────────────────────
  const [answers, setAnswers] = useState<AnswerMap>({});
  const answersRef = useRef<AnswerMap>({});
  const savedAnswersRef = useRef<AnswerMap>({});

  // ── Mark for review ──────────────────────────────────────────────────────
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  // ── Submission ───────────────────────────────────────────────────────────
  const [result, setResult] = useState<AttemptView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const submitRef = useRef<() => Promise<void>>(async () => {});

  // ── Autosave ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── Submit confirmation dialog ───────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // ── Navigation panel (mobile bottom sheet) ───────────────────────────────
  const [navOpen, setNavOpen] = useState(false);

  // ── Violation overlay ────────────────────────────────────────────────────
  const [violationState, setViolationState] = useState<ViolationState>({
    isVisible: false,
    type: null,
  });

  // ── Core submit function ─────────────────────────────────────────────────
  const submitExam = useCallback(async () => {
    if (submittingRef.current || !session) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const payload = Object.entries(answersRef.current).map(
      ([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex })
    );

    const response = await attemptsApi.submit(attemptId, payload);

    if (response.success && response.data?.attempt) {
      setResult(response.data.attempt);
    } else {
      const msg = response.error || "Could not submit your exam. Please retry.";
      setSubmitError(msg);
      setError(msg);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, session]);

  useEffect(() => {
    submitRef.current = submitExam;
  }, [submitExam]);

  // ── Load session ─────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    attemptsApi
      .getById(attemptId)
      .then((response) => {
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
        // Set initial current question to the first question's id
        if (loaded.questions.length > 0) {
          setCurrentQuestionId(loaded.questions[0].id);
        }
      })
      .catch((loadError: unknown) => {
        console.error("[Exam] Failed to load session:", loadError);
        if (active) setError("Could not load this exam. Please try again.");
      });

    return () => {
      active = false;
    };
  }, [attemptId, router]);

  // ── useExamTimer ─────────────────────────────────────────────────────────
  // initialRemainingMs is 0 until session loads; the timer hook handles that.
  const { formattedTime, colorState } = useExamTimer({
    initialRemainingMs: session?.remainingMs ?? 0,
    onExpire: useCallback(() => {
      void submitRef.current();
    }, []),
  });

  // ── useViolationDetector ─────────────────────────────────────────────────
  useViolationDetector({
    attemptId,
    enabled: !!session && !result,
    onViolation: useCallback((type: ViolationType) => {
      setViolationState({ isVisible: true, type });
    }, []),
  });

  // ── Autosave ─────────────────────────────────────────────────────────────
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
        .map(([questionId, selectedOptionIndex]) => ({
          questionId,
          selectedOptionIndex,
        }));

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
        setError(
          response.error ||
            "An answer could not be saved. It will retry after your next change."
        );
      }

      savingRef.current = false;
      setSaving(false);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [answers, attemptId, result, session]);

  // savingRef is a ref — declared separately so the effect above can read it
  const savingRef = useRef(false);

  // ── Answer helpers ───────────────────────────────────────────────────────
  function chooseAnswer(questionId: string, selectedOptionIndex: number) {
    const next = { ...answersRef.current, [questionId]: selectedOptionIndex };
    answersRef.current = next;
    setAnswers(next);
  }

  // ── Navigation helpers ───────────────────────────────────────────────────
  function currentIndex(): number {
    if (!session) return 0;
    return session.questions.findIndex((q) => q.id === currentQuestionId);
  }

  function navigateTo(questionId: string) {
    setCurrentQuestionId(questionId);
    setNavOpen(false);
  }

  function goNext() {
    if (!session) return;
    const idx = currentIndex();
    if (idx < session.questions.length - 1) {
      setCurrentQuestionId(session.questions[idx + 1].id);
    }
  }

  function goPrev() {
    if (!session) return;
    const idx = currentIndex();
    if (idx > 0) {
      setCurrentQuestionId(session.questions[idx - 1].id);
    }
  }

  // ── Mark for review toggle ────────────────────────────────────────────────
  function toggleReview() {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestionId)) {
        next.delete(currentQuestionId);
      } else {
        next.add(currentQuestionId);
      }
      return next;
    });
  }

  // ── Submit flow ───────────────────────────────────────────────────────────
  function handleSubmitClick() {
    setSubmitError(null);
    setConfirmOpen(true);
  }

  function handleConfirmSubmit() {
    void submitExam();
    setConfirmOpen(false);
  }

  function handleCancelSubmit() {
    setConfirmOpen(false);
    setSubmitError(null);
    // Return focus to the Submit button
    submitButtonRef.current?.focus();
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "var(--color-bg-primary)",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "36px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem" }}>✅</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "12px 0" }}>
            Exam submitted
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {result.testTitle}
          </p>
          <p
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "#4f8ef7",
              margin: "18px 0",
            }}
          >
            {result.score ?? 0} / {result.totalMarks ?? 0}
          </p>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Correct answers: {result.correctCount ?? 0} · Answered:{" "}
            {result.answeredCount ?? 0}
          </p>
          <Link
            href="/student/results"
            style={{
              display: "inline-block",
              marginTop: "24px",
              padding: "12px 18px",
              borderRadius: "8px",
              color: "#fff",
              background: "var(--gradient-primary)",
              textDecoration: "none",
            }}
          >
            View all results
          </Link>
        </section>
      </main>
    );
  }

  // ── Loading / error screen ────────────────────────────────────────────────
  if (!session) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "var(--color-bg-primary)",
          padding: "48px 24px",
        }}
      >
        {error ? (
          <p role="alert" style={{ color: "#f87171" }}>
            {error}
          </p>
        ) : (
          <p style={{ color: "var(--color-text-secondary)" }}>
            Loading exam session…
          </p>
        )}
        <Link
          href="/student/dashboard"
          style={{
            display: "inline-block",
            marginTop: "20px",
            color: "#4f8ef7",
          }}
        >
          Return to dashboard
        </Link>
      </main>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const qIdx = currentIndex();
  const question = session.questions[qIdx];
  const isFirstQuestion = qIdx === 0;
  const isLastQuestion = qIdx === session.questions.length - 1;
  const answeredCount = session.questions.filter(
    (item) => answers[item.id] !== undefined && answers[item.id] !== null
  ).length;
  const { unansweredCount, markedCount } = computeDialogCounts(
    answers,
    markedForReview,
    session.questions.length
  );

  // ── Exam UI ──────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Violation Overlay ──────────────────────────────────────────────── */}
      <ViolationOverlay
        isVisible={violationState.isVisible}
        violationType={violationState.type}
        onAcknowledge={() =>
          setViolationState({ isVisible: false, type: null })
        }
      />

      {/* ── Submit Confirmation Dialog ─────────────────────────────────────── */}
      <SubmitConfirmationDialog
        isOpen={confirmOpen}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        markedCount={markedCount}
        isSubmitting={submitting}
        error={submitError}
      />

      {/* ── Sticky timer ──────────────────────────────────────────────────── */}
      <StickyTimerBar
        remainingMs={session.remainingMs}
        formattedTime={formattedTime}
        colorState={colorState}
      />

      {/* ── Exam header (test title + save status) ────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          padding: "12px 24px",
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <strong>{session.test.title}</strong>
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: ".8rem",
              marginTop: "2px",
            }}
          >
            Question {qIdx + 1} of {session.questions.length}
          </div>
        </div>
        <div
          aria-live="polite"
          style={{ color: "var(--color-text-secondary)", fontSize: ".78rem" }}
        >
          {submitting ? "Submitting…" : saving ? "Saving…" : "Saved"}
        </div>
      </header>

      {/* ── Content area: sidebar (desktop) + question card ──────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "24px",
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "24px 18px 100px", // bottom padding clears FixedActionBar
          width: "100%",
          alignItems: "flex-start",
          boxSizing: "border-box",
        }}
      >
        {/* ── Desktop sidebar nav ──────────────────────────────────────────── */}
        <div className="exam-nav-sidebar">
          <QuestionNavPanel
            questions={session.questions.map((q) => ({
              id: q.id,
              order: q.order,
            }))}
            answers={answers}
            markedForReview={markedForReview}
            currentQuestionId={currentQuestionId}
            onNavigate={navigateTo}
          />
        </div>

        {/* ── Question card ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Inline error (autosave failures etc.) */}
          {error && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "rgba(239,68,68,.12)",
                color: "#f87171",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {question && (
            <div className="glass-card" style={{ padding: "26px" }}>
              <QuestionCard
                question={{
                  id: question.id,
                  text: question.text,
                  options: question.options,
                  marks: question.marks,
                  order: question.order,
                }}
                selectedOptionIndex={answers[question.id] ?? null}
                isMarkedForReview={markedForReview.has(question.id)}
                onSelectOption={(index) => chooseAnswer(question.id, index)}
                onToggleReview={toggleReview}
                totalQuestions={session.questions.length}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile FAB — opens QuestionNavPanel BottomSheet ──────────────── */}
      <FAB
        onClick={() => setNavOpen(true)}
        label="Open question navigation"
        badge={`${answeredCount}/${session.questions.length}`}
      />

      {/* ── Mobile QuestionNavPanel BottomSheet ──────────────────────────── */}
      <QuestionNavPanel
        questions={session.questions.map((q) => ({ id: q.id, order: q.order }))}
        answers={answers}
        markedForReview={markedForReview}
        currentQuestionId={currentQuestionId}
        onNavigate={navigateTo}
        isMobile
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
      />

      {/* ── FixedActionBar — Previous / Mark for Review / Next/Submit ────── */}
      <FixedActionBar>
        {/* Previous */}
        <button
          type="button"
          disabled={isFirstQuestion}
          onClick={goPrev}
          aria-label="Previous question"
          style={{
            minHeight: 44,
            minWidth: 44,
            flex: "0 0 auto",
            padding: "0 18px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
            background: "transparent",
            cursor: isFirstQuestion ? "not-allowed" : "pointer",
            opacity: isFirstQuestion ? 0.4 : 1,
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ← Prev
        </button>

        {/* Mark for Review */}
        <button
          type="button"
          onClick={toggleReview}
          aria-pressed={markedForReview.has(currentQuestionId)}
          aria-label={
            markedForReview.has(currentQuestionId)
              ? "Unmark question for review"
              : "Mark question for review"
          }
          style={{
            minHeight: 44,
            minWidth: 44,
            flex: "0 0 auto",
            padding: "0 14px",
            borderRadius: "8px",
            border: markedForReview.has(currentQuestionId)
              ? "1.5px solid rgba(245, 158, 11, 0.6)"
              : "1px solid var(--color-border)",
            background: markedForReview.has(currentQuestionId)
              ? "rgba(245, 158, 11, 0.12)"
              : "transparent",
            color: markedForReview.has(currentQuestionId)
              ? "#f59e0b"
              : "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span aria-hidden="true">
            {markedForReview.has(currentQuestionId) ? "🚩" : "🏳️"}
          </span>
          <span className="review-label">Review</span>
        </button>

        {/* Next / Submit */}
        {!isLastQuestion ? (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next question"
            style={{
              minHeight: 44,
              minWidth: 44,
              flex: "0 0 auto",
              padding: "0 18px",
              borderRadius: "8px",
              border: "none",
              color: "#fff",
              background: "var(--gradient-primary)",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        ) : (
          <button
            ref={submitButtonRef}
            type="button"
            disabled={submitting}
            onClick={handleSubmitClick}
            aria-label="Submit exam"
            style={{
              minHeight: 44,
              minWidth: 44,
              flex: "0 0 auto",
              padding: "0 18px",
              borderRadius: "8px",
              border: "none",
              color: "#fff",
              background: "#10b981",
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            {submitting ? "Submitting…" : "Submit Exam"}
          </button>
        )}
      </FixedActionBar>

      {/* ── Responsive helpers ────────────────────────────────────────────── */}
      <style>{`
        /* Show desktop sidebar, hide FAB on desktop */
        .exam-nav-sidebar {
          display: none;
        }
        .review-label {
          display: none;
        }

        @media (min-width: 768px) {
          .exam-nav-sidebar {
            display: block;
          }
          .review-label {
            display: inline;
          }
        }
      `}</style>
    </main>
  );
}
