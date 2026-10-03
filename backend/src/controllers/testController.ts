import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Test, TestStatus } from "../types/models";
import * as testService from "../services/testService";
import {
  attemptIdFor,
  getAttempt,
  isPastGrace,
  toAttemptView,
} from "../services/attemptService";
import { getStudentAccessibleTests, hasTestAccess } from "../services/testAccessService";
import {
  MAX_QUESTIONS_PER_TEST,
  createTestSchema,
  formatZodError,
  importQuestionsSchema,
  questionSchema,
  testStatusSchema,
  updateTestSchema,
} from "../validators/testValidator";

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

/** Statuses in which questions and duration may still be changed. */
const EDITABLE_STATUSES: TestStatus[] = ["draft", "scheduled"];

/** Statuses in which a test may be deleted (no student data exists yet). */
const DELETABLE_STATUSES: TestStatus[] = ["draft", "scheduled", "archived"];

/** Allowed status changes. Once active, a test can only move forward. */
const ALLOWED_TRANSITIONS: Record<TestStatus, TestStatus[]> = {
  draft: ["scheduled", "active", "archived"],
  scheduled: ["draft", "active", "archived"],
  active: ["completed"],
  completed: ["archived"],
  archived: [],
};

/** Wraps a handler so unexpected errors return JSON instead of an HTML page. */
function safe(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("[TestController]", error);
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

/** What a student may see about a test. No test ID, no questions, no answers. */
function toLobbyTest(test: Test) {
  return {
    title: test.title,
    description: test.description,
    duration: test.duration,
    totalMarks: test.totalMarks,
    questionCount: test.questionCount,
    status: test.status,
  };
}

// ------------------------------------------------------------------
// GET /api/tests (admin: all tests, student: assigned tests only)
// ------------------------------------------------------------------
export const getTests = safe(async (req, res) => {
  let status: TestStatus | undefined;
  if (typeof req.query.status === "string") {
    const parsed = testStatusSchema.safeParse(req.query.status);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid status filter." });
      return;
    }
    status = parsed.data;
  }

  const tests = isAdmin(req)
    ? await testService.listTests(status)
    : (await getStudentAccessibleTests(req.user!.id)).filter(
      (test): test is Test => test !== null && (!status || test.status === status)
    );
  res.status(200).json({ success: true, data: tests });
});

// ------------------------------------------------------------------
// GET /api/tests/:id  (admin)
// Test + all questions WITH answers.
// ------------------------------------------------------------------
export const getTestById = safe(async (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, error: "Admins only." });
    return;
  }

  const test = await testService.getTestById(paramId(req.params.id));
  if (!test) {
    res.status(404).json({ success: false, error: "Test not found." });
    return;
  }

  const questions = await testService.getQuestionsByTestId(test.id);
  res.status(200).json({ success: true, data: { ...test, questions } });
});

// ------------------------------------------------------------------
// GET /api/tests/code/:code
// The test LOBBY. A student enters the code and sees the test details and
// what they can do next. The page polls this every few seconds, so it
// switches to "ready" the moment the admin activates the test.
//
// state:
//   waiting      test exists but the admin has not started it yet
//   ready        test is active and the student has not started
//   in_progress  the student has a running attempt (resume)
//   finished     the student has already attempted this test
//   ended        the test is closed and the student never started
// ------------------------------------------------------------------
export const getLobbyByCode = safe(async (req, res) => {
  const test = await testService.getTestByCode(paramId(req.params.code));

  // Drafts and archived tests look exactly like a wrong code.
  if (!test || test.status === "draft" || test.status === "archived") {
    res.status(404).json({ success: false, error: "Invalid test code." });
    return;
  }
  if (!isAdmin(req) && !(await hasTestAccess(test.id, req.user!.id))) {
    res.status(403).json({ success: false, error: "You do not have access to this test." });
    return;
  }

  const attempt = await getAttempt(attemptIdFor(test.id, req.user!.id));

  let state: "waiting" | "ready" | "in_progress" | "finished" | "ended";
  if (attempt) {
    state =
      attempt.status === "in_progress" && !isPastGrace(attempt)
        ? "in_progress"
        : "finished";
  } else if (test.status === "active") {
    state = "ready";
  } else if (test.status === "scheduled") {
    state = "waiting";
  } else {
    state = "ended";
  }

  res.status(200).json({
    success: true,
    data: {
      test: toLobbyTest(test),
      state,
      attempt: attempt ? toAttemptView(attempt) : null,
    },
  });
});

// ------------------------------------------------------------------
// POST /api/tests  (admin)
// The new test gets its code immediately.
// ------------------------------------------------------------------
export const createTest = safe(async (req, res) => {
  const parsed = createTestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid test data.",
      details: formatZodError(parsed.error),
    });
    return;
  }

  const test = await testService.createTest(parsed.data, req.user!.id);
  res.status(201).json({ success: true, data: test });
});

// ------------------------------------------------------------------
// PUT /api/tests/:id  (admin)
// ------------------------------------------------------------------
export const updateTest = safe(async (req, res) => {
  const id = paramId(req.params.id);
  const test = await testService.getTestById(id);
  if (!test) {
    res.status(404).json({ success: false, error: "Test not found." });
    return;
  }

  const parsed = updateTestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid test data.",
      details: formatZodError(parsed.error),
    });
    return;
  }
  const patch = parsed.data;

  if (patch.duration !== undefined && !EDITABLE_STATUSES.includes(test.status)) {
    res.status(409).json({
      success: false,
      error: "Duration can only be changed while the test is draft or scheduled.",
    });
    return;
  }

  if (patch.status !== undefined && patch.status !== test.status) {
    if (!ALLOWED_TRANSITIONS[test.status].includes(patch.status)) {
      res.status(409).json({
        success: false,
        error: `A ${test.status} test cannot be changed to ${patch.status}.`,
      });
      return;
    }
    if (
      (patch.status === "scheduled" || patch.status === "active") &&
      test.questionCount === 0
    ) {
      res.status(400).json({
        success: false,
        error: "Import questions before scheduling or activating this test.",
      });
      return;
    }
  }

  const updated = await testService.updateTest(id, patch);
  res.status(200).json({ success: true, data: updated });
});

// ------------------------------------------------------------------
// POST /api/tests/:id/regenerate-code  (admin)
// Use if a code leaks. The old code stops working immediately; students who
// already started keep their running attempt.
// ------------------------------------------------------------------
export const regenerateCode = safe(async (req, res) => {
  const test = await testService.regenerateTestCode(paramId(req.params.id));
  if (!test) {
    res.status(404).json({ success: false, error: "Test not found." });
    return;
  }
  res.status(200).json({ success: true, data: { testCode: test.testCode } });
});

// ------------------------------------------------------------------
// DELETE /api/tests/:id  (admin)
// ------------------------------------------------------------------
export const deleteTest = safe(async (req, res) => {
  const id = paramId(req.params.id);
  const test = await testService.getTestById(id);
  if (!test) {
    res.status(404).json({ success: false, error: "Test not found." });
    return;
  }

  if (!DELETABLE_STATUSES.includes(test.status)) {
    res.status(409).json({
      success: false,
      error: "Active or completed tests cannot be deleted. Archive it instead.",
    });
    return;
  }

  await testService.deleteTest(id);
  res.status(200).json({ success: true, data: { message: "Test deleted." } });
});

// ------------------------------------------------------------------
// POST /api/tests/:id/questions/import  (admin)
//
// Body: { "mode": "append" | "replace", "questions": [ {...}, ... ] }
//       (a plain array of questions is also accepted)
//
// All-or-nothing: if any question is invalid, nothing is imported and the
// response lists every problem with its question number.
// The response includes the test code students will use.
// ------------------------------------------------------------------
export const importQuestions = safe(async (req, res) => {
  const id = paramId(req.params.id);
  const test = await testService.getTestById(id);
  if (!test) {
    res.status(404).json({ success: false, error: "Test not found." });
    return;
  }

  if (!EDITABLE_STATUSES.includes(test.status)) {
    res.status(409).json({
      success: false,
      error: "Questions can only be changed while the test is draft or scheduled.",
    });
    return;
  }

  const body = Array.isArray(req.body) ? { questions: req.body } : req.body;
  const payload = importQuestionsSchema.safeParse(body);
  if (!payload.success) {
    res.status(400).json({
      success: false,
      error: `Send JSON like { "questions": [ ... ] } with 1-${MAX_QUESTIONS_PER_TEST} questions.`,
      details: formatZodError(payload.error),
    });
    return;
  }

  const { mode, questions: rawQuestions } = payload.data;

  const valid: testService.NewQuestion[] = [];
  const problems: string[] = [];

  rawQuestions.forEach((raw, index) => {
    const result = questionSchema.safeParse(raw);
    if (result.success) {
      valid.push(result.data);
    } else {
      formatZodError(result.error).forEach((message) =>
        problems.push(`Question ${index + 1} — ${message}`)
      );
    }
  });

  if (problems.length > 0) {
    res.status(400).json({
      success: false,
      error: `${problems.length} problem(s) found. Nothing was imported.`,
      details: problems.slice(0, 50),
    });
    return;
  }

  const finalCount = (mode === "replace" ? 0 : test.questionCount) + valid.length;
  if (finalCount > MAX_QUESTIONS_PER_TEST) {
    res.status(400).json({
      success: false,
      error: `A test can have at most ${MAX_QUESTIONS_PER_TEST} questions (this import would make ${finalCount}).`,
    });
    return;
  }

  const result = await testService.importQuestions(id, valid, mode);
  res.status(201).json({
    success: true,
    data: {
      testId: id,
      testCode: result.test.testCode,
      mode,
      added: result.added,
      replaced: result.replaced,
      questionCount: result.test.questionCount,
      totalMarks: result.test.totalMarks,
    },
  });
});