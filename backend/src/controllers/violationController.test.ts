/**
 * Property 18: Violation submission rejected for non-in_progress attempts
 *
 * For any attempt whose status is not `in_progress`, a POST /api/violations
 * request targeting that attempt shall be rejected with a 4xx response, and
 * no violation document shall be written. Any existing violation records for
 * that attempt shall remain unchanged.
 *
 * Validates: Requirements 11.1, 11.3
 *
 * Feature: exam-lobby-admin-panel, Property 18: Violation rejected for non-in_progress
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import { AttemptStatus, ViolationType } from "../types/models";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before importing the handler under test
// ---------------------------------------------------------------------------

vi.mock("../services/attemptService", () => ({
  getAttempt: vi.fn(),
}));

vi.mock("../services/violationService", () => ({
  recordViolation: vi.fn(),
  getViolationsForAttempt: vi.fn(),
}));

import { getAttempt } from "../services/attemptService";
import { recordViolation } from "../services/violationService";
import { recordViolationHandler } from "./violationController";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_VIOLATION_TYPES: ViolationType[] = [
  "tab_switch",
  "window_blur",
  "visibility_hidden",
  "fullscreen_exit",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "keyboard_shortcut",
];

/** Non-in_progress attempt statuses that the controller must reject */
const NON_IN_PROGRESS_STATUSES: AttemptStatus[] = [
  "submitted",
  "graded",
  "force_submitted",
];

/**
 * Creates a minimal mock Express Response.
 * Captures the status code and JSON body so tests can assert on them.
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
 * Creates a minimal mock AuthenticatedRequest for the violation endpoint.
 */
function makeRequest(
  userId: string,
  body: Record<string, unknown>
): AuthenticatedRequest {
  return {
    user: {
      id: userId,
      uid: userId,
      username: "testuser",
      name: "Test User",
      role: "student",
      isAllowed: true,
    },
    body,
    params: {},
    headers: {},
    query: {},
  } as unknown as AuthenticatedRequest;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A valid violation type as fast-check arbitrary */
const violationTypeArb = fc.constantFrom(...ALLOWED_VIOLATION_TYPES);

/** An attempt status that is NOT in_progress */
const nonInProgressStatusArb = fc.constantFrom(...NON_IN_PROGRESS_STATUSES);

/** A metadata object under 10 KB serialized */
const smallMetadataArb = fc.record({
  key: fc.string({ minLength: 1, maxLength: 50 }),
  count: fc.integer({ min: 0, max: 9999 }),
});

/** A metadata object whose serialized size exceeds 10 000 bytes */
const largeMetadataArb = fc.record({
  bigField: fc.string({ minLength: 10_001, maxLength: 11_000 }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Property 18 core: non-in_progress attempts → 409, no recordViolation called
// ---------------------------------------------------------------------------

describe("recordViolationHandler — Property 18: non-in_progress attempts rejected", () => {
  it(
    "returns 409 and does NOT call recordViolation for any non-in_progress attempt status",
    async () => {
      // Feature: exam-lobby-admin-panel, Property 18: Violation rejected for non-in_progress
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),           // userId
          fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim() !== ""), // attemptId
          violationTypeArb,    // type
          nonInProgressStatusArb, // status (submitted | graded | force_submitted)
          async (userId, attemptId, type, status) => {
            vi.clearAllMocks();

            // Simulate an attempt that belongs to the user but is NOT in_progress
            (getAttempt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: attemptId,
              userId,
              status,
              testId: "test_123",
              testTitle: "Test",
              userName: "testuser",
              startedAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 3_600_000).toISOString(),
              submittedAt: new Date().toISOString(),
              score: null,
              totalMarks: null,
              correctCount: null,
              answeredCount: null,
              gradedAt: null,
            });

            const req = makeRequest(userId, { attemptId, type, metadata: { count: 1 } });
            const res = makeMockResponse();

            await recordViolationHandler(req, res as Response);

            // Must be 409 — attempt not in_progress
            expect(res._status).toBe(409);
            expect((res._body as { success: boolean }).success).toBe(false);

            // recordViolation must NEVER be called
            expect(recordViolation).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "returns 409 for all three non-in_progress statuses in unit examples",
    async () => {
      for (const status of NON_IN_PROGRESS_STATUSES) {
        vi.clearAllMocks();

        const userId = "user_abc";
        const attemptId = "att_test123_user_abc";

        (getAttempt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: attemptId,
          userId,
          status,
          testId: "test_123",
          testTitle: "Demo",
          userName: "testuser",
          startedAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 3_600_000).toISOString(),
          submittedAt: new Date().toISOString(),
          score: 8,
          totalMarks: 10,
          correctCount: 4,
          answeredCount: 5,
          gradedAt: new Date().toISOString(),
        });

        const req = makeRequest(userId, {
          attemptId,
          type: "tab_switch",
          metadata: {},
        });
        const res = makeMockResponse();

        await recordViolationHandler(req, res as Response);

        expect(res._status).toBe(409);
        expect(recordViolation).not.toHaveBeenCalled();
      }
    }
  );
});

// ---------------------------------------------------------------------------
// Happy path: in_progress attempt → 201, recordViolation IS called
// ---------------------------------------------------------------------------

describe("recordViolationHandler — in_progress attempts accepted", () => {
  it(
    "returns 201 and calls recordViolation for any valid type when attempt is in_progress",
    async () => {
      // Feature: exam-lobby-admin-panel, Property 18 (complement): in_progress succeeds
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim() !== ""),
          violationTypeArb,
          smallMetadataArb,
          async (userId, attemptId, type, metadata) => {
            vi.clearAllMocks();

            (getAttempt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: attemptId,
              userId,
              status: "in_progress",
              testId: "test_123",
              testTitle: "Test",
              userName: "testuser",
              startedAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 3_600_000).toISOString(),
              submittedAt: null,
              score: null,
              totalMarks: null,
              correctCount: null,
              answeredCount: null,
              gradedAt: null,
            });

            const fakeViolationId = `vio_${attemptId}_${Date.now()}`;
            const fakeTimestamp = new Date().toISOString();
            (recordViolation as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: fakeViolationId,
              timestamp: fakeTimestamp,
            });

            const req = makeRequest(userId, { attemptId, type, metadata });
            const res = makeMockResponse();

            await recordViolationHandler(req, res as Response);

            expect(res._status).toBe(201);
            expect((res._body as { success: boolean }).success).toBe(true);
            expect(recordViolation).toHaveBeenCalledOnce();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Validation: invalid type → 400, recordViolation never called
// ---------------------------------------------------------------------------

describe("recordViolationHandler — invalid violation type rejected (400)", () => {
  it(
    "returns 400 for any type string not in the allowed list",
    async () => {
      // Feature: exam-lobby-admin-panel, Property 18 (input validation): invalid type
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim() !== ""),
          // Generate strings that are NOT valid violation types
          fc.string({ minLength: 1, maxLength: 40 }).filter(
            (s) => !(ALLOWED_VIOLATION_TYPES as string[]).includes(s)
          ),
          async (userId, attemptId, invalidType) => {
            vi.clearAllMocks();

            // No need for getAttempt mock — validation should fail before the DB call
            const req = makeRequest(userId, { attemptId, type: invalidType });
            const res = makeMockResponse();

            await recordViolationHandler(req, res as Response);

            expect(res._status).toBe(400);
            expect((res._body as { success: boolean }).success).toBe(false);
            expect(recordViolation).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Validation: metadata over 10 KB → 413
// ---------------------------------------------------------------------------

describe("recordViolationHandler — oversized metadata rejected (413)", () => {
  it(
    "returns 413 for any metadata whose serialized size exceeds 10 000 bytes",
    async () => {
      // Feature: exam-lobby-admin-panel, Property 18 (size guard): metadata > 10 KB
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim() !== ""),
          violationTypeArb,
          largeMetadataArb,
          async (userId, attemptId, type, metadata) => {
            vi.clearAllMocks();

            const req = makeRequest(userId, { attemptId, type, metadata });
            const res = makeMockResponse();

            await recordViolationHandler(req, res as Response);

            expect(res._status).toBe(413);
            expect((res._body as { success: boolean }).success).toBe(false);
            expect(recordViolation).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Ownership check: attempt owned by different user → 403
// ---------------------------------------------------------------------------

describe("recordViolationHandler — ownership check (403)", () => {
  it("returns 403 when the attempt exists but belongs to a different user", async () => {
    vi.clearAllMocks();

    const requestingUserId = "user_alpha";
    const ownerUserId = "user_beta";
    const attemptId = "att_test123_user_beta";

    (getAttempt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: attemptId,
      userId: ownerUserId,   // different from requesting user
      status: "in_progress", // status is fine — ownership fails first
      testId: "test_123",
      testTitle: "Demo",
      userName: "beta_user",
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      submittedAt: null,
      score: null,
      totalMarks: null,
      correctCount: null,
      answeredCount: null,
      gradedAt: null,
    });

    const req = makeRequest(requestingUserId, {
      attemptId,
      type: "copy_attempt",
      metadata: {},
    });
    const res = makeMockResponse();

    await recordViolationHandler(req, res as Response);

    expect(res._status).toBe(403);
    expect(recordViolation).not.toHaveBeenCalled();
  });

  it(
    "returns 403 for any pair of distinct userIds (property test)",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          violationTypeArb,
          async (requestingUserId, ownerUserId) => {
            // Skip when they happen to be the same UUID (extremely rare but valid)
            fc.pre(requestingUserId !== ownerUserId);
            vi.clearAllMocks();

            const attemptId = `att_test_${ownerUserId}`;

            (getAttempt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              id: attemptId,
              userId: ownerUserId,
              status: "in_progress",
              testId: "test_x",
              testTitle: "T",
              userName: "u",
              startedAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 3_600_000).toISOString(),
              submittedAt: null,
              score: null,
              totalMarks: null,
              correctCount: null,
              answeredCount: null,
              gradedAt: null,
            });

            const req = makeRequest(requestingUserId, {
              attemptId,
              type: "tab_switch",
            });
            const res = makeMockResponse();

            await recordViolationHandler(req, res as Response);

            expect(res._status).toBe(403);
            expect(recordViolation).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Missing required fields → 400
// ---------------------------------------------------------------------------

describe("recordViolationHandler — missing required fields (400)", () => {
  it("returns 400 when attemptId is missing", async () => {
    const req = makeRequest("user_1", { type: "tab_switch" });
    const res = makeMockResponse();

    await recordViolationHandler(req, res as Response);

    expect(res._status).toBe(400);
    expect(recordViolation).not.toHaveBeenCalled();
  });

  it("returns 400 when type is missing", async () => {
    const req = makeRequest("user_1", { attemptId: "att_abc" });
    const res = makeMockResponse();

    await recordViolationHandler(req, res as Response);

    expect(res._status).toBe(400);
    expect(recordViolation).not.toHaveBeenCalled();
  });

  it("returns 400 when attemptId is an empty string", async () => {
    const req = makeRequest("user_1", { attemptId: "   ", type: "tab_switch" });
    const res = makeMockResponse();

    await recordViolationHandler(req, res as Response);

    expect(res._status).toBe(400);
    expect(recordViolation).not.toHaveBeenCalled();
  });

  it("returns 400 when metadata is an array (not a plain object)", async () => {
    const req = makeRequest("user_1", {
      attemptId: "att_abc",
      type: "tab_switch",
      metadata: [1, 2, 3],
    });
    const res = makeMockResponse();

    await recordViolationHandler(req, res as Response);

    expect(res._status).toBe(400);
    expect(recordViolation).not.toHaveBeenCalled();
  });
});
