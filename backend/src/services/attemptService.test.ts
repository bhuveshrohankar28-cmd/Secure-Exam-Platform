/**
 * Property-based tests for attemptService
 *
 * Feature: exam-lobby-admin-panel, Property 19: Autosave is idempotent
 *
 * Validates: Requirements 15.3
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import type { TestAttempt } from "../types/models";

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------
// The in-memory path in attemptService requires:
//   - firebase/firebaseAdmin: db must be null (no Firestore)
//   - auditLogService: writeAuditLog must be a no-op for unit tests
// ---------------------------------------------------------------------------

vi.mock("../firebase/firebaseAdmin", () => ({ db: null }));
vi.mock("../services/userService", () => ({ updateLastSeen: vi.fn() }));
vi.mock("./userService", () => ({ updateLastSeen: vi.fn() }));
vi.mock("./gradingService", () => ({ gradeAttempt: vi.fn() }));
vi.mock("./testService", () => ({ getQuestionsByTestId: vi.fn() }));
vi.mock("./auditLogService", () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));

import { upsertAnswers, getAnswers } from "./attemptService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid in-progress attempt for the in-memory path. */
function makeMockAttempt(id: string): TestAttempt {
  return {
    id,
    testId: "test123",
    testTitle: "Test",
    userId: "user456",
    userName: "testuser",
    status: "in_progress",
    startedAt: "2024-01-01T00:00:00Z",
    endsAt: "2024-01-01T01:00:00Z",
    submittedAt: null,
    score: null,
    totalMarks: null,
    correctCount: null,
    answeredCount: null,
    gradedAt: null,
  };
}

/** Sort an Answer array by id for stable comparison. */
function sortedById<T extends { id: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const answerArb = fc.record({
  questionId: fc.uuid(),
  selectedOptionIndex: fc.option(fc.integer({ min: 0, max: 3 }), { nil: null }),
});

// Use arrays with unique questionIds to mirror realistic payloads.
// uniqueArray by the questionId field ensures no duplicate question entries
// in the same call (the service itself uses composite IDs so duplicates would
// just overwrite — either way idempotency holds, but unique inputs are cleaner).
const answerArrayArb = fc.uniqueArray(answerArb, {
  selector: (a) => a.questionId,
  minLength: 1,
  maxLength: 20,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upsertAnswers — Property 19: Autosave is idempotent", () => {
  // Each test uses a fresh attempt ID so the in-memory map doesn't carry state
  // from a prior test run.
  let callCount = 0;
  const freshAttempt = (): TestAttempt =>
    makeMockAttempt(`att_test${++callCount}_user456`);

  it("calling upsertAnswers twice with the same payload yields the same getAnswers() result as calling once", async () => {
    // Feature: exam-lobby-admin-panel, Property 19: Autosave is idempotent
    await fc.assert(
      fc.asyncProperty(answerArrayArb, async (answers) => {
        const attempt = freshAttempt();

        // First call
        await upsertAnswers(attempt, answers);
        const state1 = sortedById(await getAnswers(attempt.id));

        // Second call — same payload
        await upsertAnswers(attempt, answers);
        const state2 = sortedById(await getAnswers(attempt.id));

        // Both calls must produce the same length
        expect(state2.length).toBe(state1.length);

        // Each answer must have identical shape in both states
        for (let i = 0; i < state1.length; i++) {
          expect(state2[i].id).toBe(state1[i].id);
          expect(state2[i].questionId).toBe(state1[i].questionId);
          expect(state2[i].selectedOptionIndex).toBe(
            state1[i].selectedOptionIndex
          );
          expect(state2[i].attemptId).toBe(state1[i].attemptId);
          expect(state2[i].userId).toBe(state1[i].userId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("calling upsertAnswers with an empty array is a no-op (getAnswers returns empty)", async () => {
    // Feature: exam-lobby-admin-panel, Property 19: Autosave is idempotent (empty-array edge case)
    const attempt = freshAttempt();

    await upsertAnswers(attempt, []);
    const state = await getAnswers(attempt.id);

    expect(state).toHaveLength(0);
  });

  it("calling upsertAnswers with an empty array after a non-empty call leaves state unchanged", async () => {
    // Feature: exam-lobby-admin-panel, Property 19: Autosave is idempotent (empty second call)
    await fc.assert(
      fc.asyncProperty(answerArrayArb, async (answers) => {
        const attempt = freshAttempt();

        await upsertAnswers(attempt, answers);
        const stateBefore = sortedById(await getAnswers(attempt.id));

        // Calling with an empty array should not modify existing answers
        await upsertAnswers(attempt, []);
        const stateAfter = sortedById(await getAnswers(attempt.id));

        expect(stateAfter.length).toBe(stateBefore.length);

        for (let i = 0; i < stateBefore.length; i++) {
          expect(stateAfter[i].id).toBe(stateBefore[i].id);
          expect(stateAfter[i].selectedOptionIndex).toBe(
            stateBefore[i].selectedOptionIndex
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it("stored answers use composite IDs <attemptId>_<questionId> ensuring no duplicates", async () => {
    // Feature: exam-lobby-admin-panel, Property 19: Autosave is idempotent
    await fc.assert(
      fc.asyncProperty(answerArrayArb, async (answers) => {
        const attempt = freshAttempt();

        await upsertAnswers(attempt, answers);
        const stored = await getAnswers(attempt.id);

        // Exactly one answer per question — composite ID prevents duplicates
        expect(stored.length).toBe(answers.length);

        const idSet = new Set(stored.map((a) => a.id));
        expect(idSet.size).toBe(stored.length);

        for (const a of stored) {
          expect(a.id).toBe(`${attempt.id}_${a.questionId}`);
        }
      }),
      { numRuns: 100 }
    );
  });
});
