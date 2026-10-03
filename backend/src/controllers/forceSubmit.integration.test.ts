/**
 * Integration tests for the admin force-submit flow.
 *
 * Tests the `forceSubmitAttempt` controller handler end-to-end using the
 * in-memory store (db = null path). No real Firestore or HTTP server needed.
 *
 * Validates: Requirements 13.3, 13.4, 13.5, 14.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import type { TestAttempt } from "../types/models";

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that transitively load these
// ---------------------------------------------------------------------------

vi.mock("../firebase/firebaseAdmin", () => ({ db: null }));
vi.mock("../services/auditLogService", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../services/testService", () => ({
  getQuestionsByTestId: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Service imports — after mocks are in place
// ---------------------------------------------------------------------------

import { createAttemptIfAbsent, getAttempt } from "../services/attemptService";
import { writeAuditLog } from "../services/auditLogService";
import { forceSubmitAttempt } from "./attemptController";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal in-progress attempt for the in-memory store. */
function makeAttempt(overrides: Partial<TestAttempt> = {}): TestAttempt {
  const now = new Date();
  const ends = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  return {
    id: "att_test1_user1",
    testId: "test1",
    testTitle: "Integration Test Exam",
    userId: "user1",
    userName: "Alice",
    status: "in_progress",
    startedAt: now.toISOString(),
    endsAt: ends.toISOString(),
    submittedAt: null,
    score: null,
    totalMarks: null,
    correctCount: null,
    answeredCount: null,
    gradedAt: null,
    ...overrides,
  };
}

/**
 * Builds a minimal mock Express Response that captures the status code and
 * JSON body, mirroring the pattern used in violationController.test.ts.
 */
function makeMockResponse() {
  const res: Partial<Response> & {
    _status: number | null;
    _body: unknown;
    headersSent: boolean;
  } = {
    _status: null,
    _body: null,
    headersSent: false,
    status: vi.fn().mockImplementation(function (code: number) {
      res._status = code;
      return res as Response;
    }) as unknown as Response["status"],
    json: vi.fn().mockImplementation(function (body: unknown) {
      res._body = body;
      res.headersSent = true;
      return res as Response;
    }) as unknown as Response["json"],
  };
  return res;
}

/**
 * Builds a minimal AuthenticatedRequest for an admin calling force-submit.
 */
function makeAdminRequest(attemptId: string): AuthenticatedRequest {
  return {
    user: {
      id: "admin1",
      uid: "admin1",
      username: "admin",
      name: "Admin User",
      role: "admin",
      isAllowed: true,
    },
    params: { id: attemptId },
    body: {},
    headers: {},
    query: {},
  } as unknown as AuthenticatedRequest;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("forceSubmitAttempt — integration (in-memory store)", () => {
  // -------------------------------------------------------------------------
  // Happy path: force-submit an in-progress attempt
  // -------------------------------------------------------------------------

  describe("happy path: in-progress attempt → force_submitted", () => {
    it("returns 200 with success: true and status force_submitted", async () => {
      // Arrange: seed the in-memory store with an in-progress attempt
      const attempt = makeAttempt();
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      // Act
      await forceSubmitAttempt(req, res as Response);

      // Assert: HTTP response
      expect(res._status).toBe(200);
      const body = res._body as { success: boolean; data: { attempt: { status: string } } };
      expect(body.success).toBe(true);
      expect(body.data.attempt.status).toBe("force_submitted");
    });

    it("persists force_submitted status in the in-memory store", async () => {
      // Arrange: use a distinct attempt ID for isolation
      const attempt = makeAttempt({ id: "att_test2_user2", userId: "user2" });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      // Act
      await forceSubmitAttempt(req, res as Response);

      // Assert: the stored attempt is now force_submitted
      const stored = await getAttempt(attempt.id);
      expect(stored).not.toBeNull();
      expect(stored!.status).toBe("force_submitted");
    });

    it("writes an EXAM_FORCE_SUBMITTED audit log entry", async () => {
      // Arrange
      const attempt = makeAttempt({ id: "att_test3_user3", userId: "user3" });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      // Act
      await forceSubmitAttempt(req, res as Response);

      // Assert: audit log was written at least once with EXAM_FORCE_SUBMITTED
      const calls = (writeAuditLog as ReturnType<typeof vi.fn>).mock.calls;
      const forceSubmitLog = calls.find(
        ([log]: [{ action: string }]) => log.action === "EXAM_FORCE_SUBMITTED"
      );
      expect(forceSubmitLog).toBeDefined();
      const [logEntry] = forceSubmitLog!;
      expect(logEntry.entityId).toBe(attempt.id);
      expect(logEntry.metadata.studentId).toBe(attempt.userId);
      expect(logEntry.metadata.testId).toBe(attempt.testId);
    });

    it("response body includes score and totalMarks fields (graded with zero questions)", async () => {
      // getQuestionsByTestId is mocked to return [] so score=0, totalMarks=0
      const attempt = makeAttempt({ id: "att_test4_user4", userId: "user4" });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      const body = res._body as {
        success: boolean;
        data: {
          attempt: {
            status: string;
            score: number | null;
            totalMarks: number | null;
          };
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.attempt.status).toBe("force_submitted");
      // With no questions, both are 0 (gradeAttempt returns 0 for empty array)
      expect(body.data.attempt.score).toBe(0);
      expect(body.data.attempt.totalMarks).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Rejection: non-existent attempt → 404
  // -------------------------------------------------------------------------

  describe("rejection: non-existent attempt → 404", () => {
    it("returns 404 when the attempt ID does not exist", async () => {
      const req = makeAdminRequest("att_does_not_exist");
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      expect(res._status).toBe(404);
      const body = res._body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it("does not write any audit log for a missing attempt", async () => {
      const req = makeAdminRequest("att_nonexistent_xyz");
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      // No EXAM_FORCE_SUBMITTED audit log should be written
      const calls = (writeAuditLog as ReturnType<typeof vi.fn>).mock.calls;
      const forceSubmitLog = calls.find(
        ([log]: [{ action: string }]) => log.action === "EXAM_FORCE_SUBMITTED"
      );
      expect(forceSubmitLog).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Rejection: already-submitted attempt → 409
  // -------------------------------------------------------------------------

  describe("rejection: already-submitted attempt → 409", () => {
    it("returns 409 when the attempt status is graded", async () => {
      const attempt = makeAttempt({
        id: "att_test5_user5",
        userId: "user5",
        status: "graded",
        submittedAt: new Date().toISOString(),
        score: 5,
        totalMarks: 10,
        correctCount: 2,
        answeredCount: 3,
        gradedAt: new Date().toISOString(),
      });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      expect(res._status).toBe(409);
      const body = res._body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it("returns 409 when the attempt status is force_submitted", async () => {
      const attempt = makeAttempt({
        id: "att_test6_user6",
        userId: "user6",
        status: "force_submitted",
        submittedAt: new Date().toISOString(),
        score: 3,
        totalMarks: 10,
        correctCount: 1,
        answeredCount: 2,
        gradedAt: new Date().toISOString(),
      });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      expect(res._status).toBe(409);
      const body = res._body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it("returns 409 when the attempt status is submitted", async () => {
      const attempt = makeAttempt({
        id: "att_test7_user7",
        userId: "user7",
        status: "submitted",
        submittedAt: new Date().toISOString(),
        score: null,
        totalMarks: null,
        correctCount: null,
        answeredCount: null,
        gradedAt: null,
      });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      expect(res._status).toBe(409);
      const body = res._body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it("does not alter the stored attempt when it is already submitted", async () => {
      const gradedAt = new Date().toISOString();
      const attempt = makeAttempt({
        id: "att_test8_user8",
        userId: "user8",
        status: "graded",
        submittedAt: gradedAt,
        score: 7,
        totalMarks: 10,
        correctCount: 3,
        answeredCount: 4,
        gradedAt,
      });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      // Status must still be graded (not changed to force_submitted)
      const stored = await getAttempt(attempt.id);
      expect(stored!.status).toBe("graded");
    });

    it("includes the current attempt data in the 409 response body", async () => {
      const attempt = makeAttempt({
        id: "att_test9_user9",
        userId: "user9",
        status: "graded",
        submittedAt: new Date().toISOString(),
        score: 9,
        totalMarks: 10,
        correctCount: 4,
        answeredCount: 5,
        gradedAt: new Date().toISOString(),
      });
      await createAttemptIfAbsent(attempt);

      const req = makeAdminRequest(attempt.id);
      const res = makeMockResponse();

      await forceSubmitAttempt(req, res as Response);

      expect(res._status).toBe(409);
      const body = res._body as {
        success: boolean;
        data?: { attempt?: { status: string } };
      };
      // The response should carry the current attempt view for the client
      expect(body.data?.attempt?.status).toBe("graded");
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency concern: calling force-submit twice on a completed attempt
  // -------------------------------------------------------------------------

  describe("idempotency: calling force-submit twice", () => {
    it("second call returns 409 with success: false (attempt is no longer in_progress)", async () => {
      // Arrange: seed an in-progress attempt
      const attempt = makeAttempt({ id: "att_test10_user10", userId: "user10" });
      await createAttemptIfAbsent(attempt);

      const req1 = makeAdminRequest(attempt.id);
      const res1 = makeMockResponse();
      await forceSubmitAttempt(req1, res1 as Response);
      expect(res1._status).toBe(200);

      // Second call on the now force_submitted attempt
      const req2 = makeAdminRequest(attempt.id);
      const res2 = makeMockResponse();
      await forceSubmitAttempt(req2, res2 as Response);

      expect(res2._status).toBe(409);
      const body2 = res2._body as { success: boolean };
      expect(body2.success).toBe(false);
    });
  });
});
