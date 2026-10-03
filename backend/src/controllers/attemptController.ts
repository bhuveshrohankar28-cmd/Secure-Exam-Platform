import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Question, TestAttempt } from "../types/models";
import { getQuestionsByTestId, getTestByCode } from "../services/testService";
import { getUserById } from "../services/userService";
import { hasTestAccess } from "../services/testAccessService";
import {
  attemptIdFor,
  createAttemptIfAbsent,
  deleteAttemptAndAnswers,
  finalizeAttempt,
  getAnswers,
  getAttempt,
  getQuestionIdSet,
  isPastGrace,
  listAttempts,
  remainingMs,
  toAttemptView,
  touchPresence,
  upsertAnswers,
} from "../services/attemptService";
import { writeAuditLog } from "../services/auditLogService";
import { getViolationCountsByAttemptIds } from "../services/violationService";
import { seededShuffle } from "../utils/shuffle";
import { formatZodError } from "../validators/testValidator";
import {
  AnswerInput,
  saveAnswersSchema,
  startAttemptSchema,
  submitSchema,
} from "../validators/attemptValidator";

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

/** Wraps a handler so unexpected errors return JSON instead of an HTML page. */
function safe(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("[AttemptController]", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Something went wrong. Please try again.",
        });
      }
    }
  };
}

function isAdmin(req: AuthenticatedRequest): boolean {
  return req.user?.role === "admin" || req.user?.role === "superadmin";
}

function paramId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

/** Server time lets the client's countdown ignore a wrong phone clock. */
function timing(attempt: TestAttempt) {
  return {
    remainingMs: Math.max(0, remainingMs(attempt)),
    serverTime: new Date().toISOString(),
  };
}

/**
 * Questions as the student sees them: NO correctOptionIndex, and a different
 * order for every student (stable across refreshes).
 */
function toStudentQuestions(attempt: TestAttempt, questions: Question[]) {
  return seededShuffle(questions, attempt.id).map((q, index) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    marks: q.marks,
    order: index + 1,
  }));
}

async function loadAnswerMap(attemptId: string): Promise<Record<string, number | null>> {
  const answers = await getAnswers(attemptId);
  return Object.fromEntries(answers.map((a) => [a.questionId, a.selectedOptionIndex]));
}

/** Everything the exam screen needs to start, or to continue after a refresh. */
async function buildSession(attempt: TestAttempt, resumed: boolean) {
  const questions = await getQuestionsByTestId(attempt.testId);
  const answers = await loadAnswerMap(attempt.id);
  const durationMinutes = Math.round(
    (new Date(attempt.endsAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000
  );

  return {
    resumed,
    attempt: toAttemptView(attempt),
    test: {
      title: attempt.testTitle,
      duration: durationMinutes,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    },
    questions: toStudentQuestions(attempt, questions),
    answers,
    ...timing(attempt),
  };
}

/** Checks every answer refers to a real question of this test. */
async function checkAnswers(
  attempt: TestAttempt,
  items: AnswerInput[]
): Promise<{ ok: true; items: AnswerInput[] } | { ok: false; error: string }> {
  const validIds = await getQuestionIdSet(attempt.testId);
  const unknown = items.filter((item) => !validIds.has(item.questionId));
  if (unknown.length > 0) {
    return { ok: false, error: `${unknown.length} answer(s) refer to unknown questions.` };
  }

  // If a question appears twice, the last value wins.
  const latest = new Map<string, AnswerInput>();
  items.forEach((item) => latest.set(item.questionId, item));
  return { ok: true, items: Array.from(latest.values()) };
}

// ------------------------------------------------------------------
// POST /api/attempts   body: { code }
// Starts the test, or resumes a running attempt (same call, same result).
// ------------------------------------------------------------------
export const startAttempt = safe(async (req, res) => {
  const user = req.user!;
  if (user.role !== "student") {
    res.status(403).json({ success: false, error: "Only students can take tests." });
    return;
  }

  const parsed = startAttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Enter the test code.",
      details: formatZodError(parsed.error),
    });
    return;
  }

  const test = await getTestByCode(parsed.data.code);
  if (!test || test.status === "draft" || test.status === "archived") {
    res.status(404).json({ success: false, error: "Invalid test code." });
    return;
  }
  if (!(await hasTestAccess(test.id, user.id))) {
    res.status(403).json({
      success: false,
      error: "You do not have access to this test. Please contact your examiner.",
    });
    return;
  }
  if (test.status === "scheduled") {
    res.status(409).json({
      success: false,
      error: "This test has not started yet. Please wait in the lobby.",
    });
    return;
  }

  // The token can be up to 24 h old, so check the account is still allowed.
  const account = await getUserById(user.id);
  if (!account || !account.isAllowed) {
    res.status(403).json({
      success: false,
      error: "Your access has been disabled. Please contact your examiner.",
    });
    return;
  }

  const existing = await getAttempt(attemptIdFor(test.id, user.id));

  // A completed test can only be resumed, never newly started.
  if (test.status === "completed" && !existing) {
    res.status(409).json({ success: false, error: "This test has ended." });
    return;
  }

  let attempt: TestAttempt;
  let created = false;

  if (existing) {
    attempt = existing;
  } else {
    const now = new Date();
    const result = await createAttemptIfAbsent({
      id: attemptIdFor(test.id, user.id),
      testId: test.id,
      testTitle: test.title,
      userId: user.id,
      userName: account.name,
      status: "in_progress",
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + test.duration * 60_000).toISOString(),
      submittedAt: null,
      score: null,
      totalMarks: null,
      correctCount: null,
      answeredCount: null,
      gradedAt: null,
    });
    attempt = result.attempt;
    created = result.created;
  }

  if (attempt.status === "in_progress" && isPastGrace(attempt)) {
    attempt = await finalizeAttempt(attempt);
  }

  if (attempt.status !== "in_progress") {
    res.status(409).json({
      success: false,
      error: "You have already attempted this test.",
      data: { attempt: toAttemptView(attempt) },
    });
    return;
  }

  await touchPresence(user.id);
  const session = await buildSession(attempt, !created);
  res.status(created ? 201 : 200).json({ success: true, data: session });
});

// ------------------------------------------------------------------
// GET /api/attempts/mine
// ------------------------------------------------------------------
export const getMyAttempts = safe(async (req, res) => {
  const attempts = await listAttempts({ userId: req.user!.id });
  res.status(200).json({ success: true, data: attempts.map(toAttemptView) });
});

// ------------------------------------------------------------------
// GET /api/attempts/:id
// Student (owner): running attempt returns the full exam session so the page
// can recover after a refresh; a finished one returns the result.
// Admin: summary of any attempt.
// ------------------------------------------------------------------
export const getAttemptById = safe(async (req, res) => {
  const attempt = await getAttempt(paramId(req.params.id));
  const admin = isAdmin(req);

  // Other students' attempts look like they do not exist.
  if (!attempt || (!admin && attempt.userId !== req.user!.id)) {
    res.status(404).json({ success: false, error: "Attempt not found." });
    return;
  }

  let current = attempt;
  if (current.status === "in_progress" && isPastGrace(current)) {
    current = await finalizeAttempt(current);
  }

  if (current.status === "in_progress" && !admin) {
    await touchPresence(req.user!.id);
    res.status(200).json({ success: true, data: await buildSession(current, true) });
    return;
  }

  res.status(200).json({ success: true, data: { attempt: toAttemptView(current) } });
});

// ------------------------------------------------------------------
// POST /api/attempts/:id/answers
// Autosave. Send only the answers that changed.
// ------------------------------------------------------------------
export const saveAnswers = safe(async (req, res) => {
  const attempt = await getAttempt(paramId(req.params.id));
  if (!attempt || attempt.userId !== req.user!.id) {
    res.status(404).json({ success: false, error: "Attempt not found." });
    return;
  }

  if (attempt.status !== "in_progress") {
    res.status(409).json({
      success: false,
      error: "This attempt is already submitted.",
      data: { attempt: toAttemptView(attempt) },
    });
    return;
  }

  if (isPastGrace(attempt)) {
    const done = await finalizeAttempt(attempt);
    res.status(409).json({
      success: false,
      expired: true,
      error: "Time is over. Your saved answers were submitted.",
      data: { attempt: toAttemptView(done) },
    });
    return;
  }

  const parsed = saveAnswersSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid answers.",
      details: formatZodError(parsed.error),
    });
    return;
  }

  const checked = await checkAnswers(attempt, parsed.data.answers);
  if (!checked.ok) {
    res.status(400).json({ success: false, error: checked.error });
    return;
  }

  await upsertAnswers(attempt, checked.items);
  await touchPresence(attempt.userId);

  res.status(200).json({
    success: true,
    data: { saved: checked.items.length, ...timing(attempt) },
  });
});

// ------------------------------------------------------------------
// POST /api/attempts/:id/submit
// Optional body { answers: [...] } carries the last unsaved answers.
// Calling it again returns the same result (safe to retry).
// ------------------------------------------------------------------
export const submitAttempt = safe(async (req, res) => {
  const attempt = await getAttempt(paramId(req.params.id));
  if (!attempt || attempt.userId !== req.user!.id) {
    res.status(404).json({ success: false, error: "Attempt not found." });
    return;
  }

  if (attempt.status !== "in_progress") {
    res.status(200).json({
      success: true,
      data: { alreadySubmitted: true, attempt: toAttemptView(attempt) },
    });
    return;
  }

  const parsed = submitSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid answers.",
      details: formatZodError(parsed.error),
    });
    return;
  }

  // Answers arriving after the grace period are ignored; the saved ones count.
  const lastAnswers = parsed.data.answers ?? [];
  if (lastAnswers.length > 0 && !isPastGrace(attempt)) {
    const checked = await checkAnswers(attempt, lastAnswers);
    if (!checked.ok) {
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    await upsertAnswers(attempt, checked.items);
  }

  const graded = await finalizeAttempt(attempt);
  res.status(200).json({ success: true, data: { attempt: toAttemptView(graded) } });
});

// ------------------------------------------------------------------
// GET /api/admin/attempts?testId=&status=   (admin)
// ------------------------------------------------------------------
export const listAllAttempts = safe(async (req, res) => {
  const testId = typeof req.query.testId === "string" ? req.query.testId : undefined;
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const allowed = ["in_progress", "submitted", "graded", "force_submitted"];
  if (statusParam && !allowed.includes(statusParam)) {
    res.status(400).json({ success: false, error: "Invalid status filter." });
    return;
  }

  const attempts = await listAttempts({
    testId,
    status: statusParam as TestAttempt["status"] | undefined,
  });

  const violationCounts = await getViolationCountsByAttemptIds(attempts.map((a) => a.id));

  res.status(200).json({
    success: true,
    data: attempts.map((a) => ({
      ...toAttemptView(a),
      userName: a.userName,
      testId: a.testId,
      violationCount: violationCounts.get(a.id) ?? 0,
    })),
    total: attempts.length,
  });
});

// ------------------------------------------------------------------
// POST /api/admin/attempts/:id/reset   (admin)
// Deletes the attempt and its answers so the student can start again.
// Use when someone took another student's ID, or a phone died mid-exam.
// ------------------------------------------------------------------
export const resetAttempt = safe(async (req, res) => {
  const deleted = await deleteAttemptAndAnswers(paramId(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: "Attempt not found." });
    return;
  }
  res.status(200).json({
    success: true,
    data: { message: "Attempt reset. The student can join the test again." },
  });
});

// ------------------------------------------------------------------
// POST /api/admin/attempts/:id/force-submit   (admin)
// Grades and closes a student's in-progress attempt on their behalf.
// ------------------------------------------------------------------
export const forceSubmitAttempt = safe(async (req, res) => {
  const id = paramId(req.params.id);
  const attempt = await getAttempt(id);

  if (!attempt) {
    res.status(404).json({ success: false, error: "Attempt not found." });
    return;
  }

  if (attempt.status !== "in_progress") {
    res.status(409).json({
      success: false,
      error: "Attempt is not in_progress.",
      data: { attempt: toAttemptView(attempt) },
    });
    return;
  }

  // Grade the attempt using the existing finalize logic, then override
  // the status to "force_submitted" so it is distinguishable from a
  // normal student submission.
  const graded = await finalizeAttempt(attempt);
  const forceSubmitted: TestAttempt = { ...graded, status: "force_submitted" };

  // Persist the status override directly via the internal save path.
  // finalizeAttempt already persisted as "graded"; we need one more write
  // to flip the status to "force_submitted".
  const { saveAttemptForce } = await import("../services/attemptService").then(
    (m) => ({ saveAttemptForce: m.saveAttemptPublic ?? null })
  );

  // saveAttemptPublic may not exist yet — use the public helper if available,
  // otherwise fall back to re-using createAttemptIfAbsent which is an upsert.
  // The cleanest path: call the module's internal save via a thin re-export.
  // We add `saveAttemptPublic` to attemptService in the same task.
  // For now, write via the upsert that createAttemptIfAbsent exposes:
  // Since db.set() is idempotent, writing via createAttemptIfAbsent with the
  // updated object is equivalent to a save. However, the cleanest solution is
  // to export a dedicated helper. We do that below.

  // Re-import after potential circular resolution — just call the exported fn.
  const attemptModule = await import("../services/attemptService");
  if (typeof attemptModule.saveAttemptPublic === "function") {
    await attemptModule.saveAttemptPublic(forceSubmitted);
  } else {
    // Fallback: overwrite via set using createAttemptIfAbsent won't work
    // for an existing doc; use db directly or the in-memory map.
    // We rely on the exported saveAttemptPublic added below.
    throw new Error("saveAttemptPublic is not exported from attemptService.");
  }

  await writeAuditLog({
    id: `auditlog_force_${id}_${Date.now()}`,
    userId: req.user!.id,
    action: "EXAM_FORCE_SUBMITTED",
    entityType: "attempt",
    entityId: id,
    timestamp: new Date().toISOString(),
    metadata: {
      studentId: attempt.userId,
      testId: attempt.testId,
      score: forceSubmitted.score,
      totalMarks: forceSubmitted.totalMarks,
    },
  });

  res.status(200).json({
    success: true,
    data: { attempt: toAttemptView(forceSubmitted) },
  });
});