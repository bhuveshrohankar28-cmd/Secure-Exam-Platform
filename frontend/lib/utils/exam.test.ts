/**
 * Property-based tests for exam state helper functions.
 * Validates: Requirements 15.11, 16.2, 16.3, 16.6, 16.7, 17.1, 18.1
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  toggleReview,
  questionNavState,
  computeSummary,
  computeDialogCounts,
} from "./exam";

// ---------------------------------------------------------------------------
// Property 14: Mark-for-review is a pure toggle (round trip)
// Validates: Requirements 15.11, 18.1
// ---------------------------------------------------------------------------
describe("Property 14: toggleReview is a pure round-trip", () => {
  it("toggleReview(toggleReview(b)) === b for any boolean b", () => {
    fc.assert(
      fc.property(fc.boolean(), (b) => {
        expect(toggleReview(toggleReview(b))).toBe(b);
      })
    );
  });

  it("a single toggle flips the value", () => {
    expect(toggleReview(true)).toBe(false);
    expect(toggleReview(false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 15: Question nav panel state priority is total and deterministic
// Validates: Requirements 16.2, 16.3
// ---------------------------------------------------------------------------
describe("Property 15: questionNavState priority is total and deterministic", () => {
  const validStates = ["current", "marked", "answered", "unanswered"] as const;

  it("always returns one of the four valid states for any flag combination", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.boolean(), (isCurrent, isMarkedForReview, isAnswered) => {
        const result = questionNavState({ isCurrent, isMarkedForReview, isAnswered });
        expect(validStates).toContain(result);
      })
    );
  });

  it("isCurrent=true → always 'current' regardless of other flags", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (isMarkedForReview, isAnswered) => {
        const result = questionNavState({ isCurrent: true, isMarkedForReview, isAnswered });
        expect(result).toBe("current");
      })
    );
  });

  it("isCurrent=false, isMarkedForReview=true → always 'marked' regardless of isAnswered", () => {
    fc.assert(
      fc.property(fc.boolean(), (isAnswered) => {
        const result = questionNavState({ isCurrent: false, isMarkedForReview: true, isAnswered });
        expect(result).toBe("marked");
      })
    );
  });

  it("isCurrent=false, isMarkedForReview=false, isAnswered=true → 'answered'", () => {
    const result = questionNavState({ isCurrent: false, isMarkedForReview: false, isAnswered: true });
    expect(result).toBe("answered");
  });

  it("all false → 'unanswered'", () => {
    const result = questionNavState({ isCurrent: false, isMarkedForReview: false, isAnswered: false });
    expect(result).toBe("unanswered");
  });

  it("is deterministic: same flags always produce the same result", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.boolean(), (isCurrent, isMarkedForReview, isAnswered) => {
        const flags = { isCurrent, isMarkedForReview, isAnswered };
        expect(questionNavState(flags)).toBe(questionNavState(flags));
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Summary row counts are consistent with individual question states
// Validates: Requirements 16.6, 16.7
// ---------------------------------------------------------------------------
describe("Property 16: computeSummary counts sum to questions.length", () => {
  const questionArb = fc.record({
    state: fc.constantFrom("answered", "unanswered", "marked" as const),
  });

  it("answeredCount + unansweredCount + markedCount === questions.length for any array", () => {
    fc.assert(
      fc.property(fc.array(questionArb), (questions) => {
        const { answeredCount, unansweredCount, markedCount } = computeSummary(questions);
        expect(answeredCount + unansweredCount + markedCount).toBe(questions.length);
      })
    );
  });

  it("each count is non-negative for any array", () => {
    fc.assert(
      fc.property(fc.array(questionArb), (questions) => {
        const { answeredCount, unansweredCount, markedCount } = computeSummary(questions);
        expect(answeredCount).toBeGreaterThanOrEqual(0);
        expect(unansweredCount).toBeGreaterThanOrEqual(0);
        expect(markedCount).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it("counts reflect the correct number of each state", () => {
    fc.assert(
      fc.property(fc.array(questionArb), (questions) => {
        const { answeredCount, unansweredCount, markedCount } = computeSummary(questions);
        const expectedAnswered = questions.filter((q) => q.state === "answered").length;
        const expectedUnanswered = questions.filter((q) => q.state === "unanswered").length;
        const expectedMarked = questions.filter((q) => q.state === "marked").length;
        expect(answeredCount).toBe(expectedAnswered);
        expect(unansweredCount).toBe(expectedUnanswered);
        expect(markedCount).toBe(expectedMarked);
      })
    );
  });

  it("works correctly for an empty array", () => {
    const result = computeSummary([]);
    expect(result).toEqual({ answeredCount: 0, unansweredCount: 0, markedCount: 0 });
  });
});

// ---------------------------------------------------------------------------
// Property 17: Submit confirmation dialog counts match in-memory state
// Validates: Requirements 17.1
// ---------------------------------------------------------------------------
describe("Property 17: computeDialogCounts matches in-memory state", () => {
  // Arbitrary for answer values: number, null, or undefined
  const answerValueArb = fc.oneof(
    fc.integer({ min: 0, max: 3 }),
    fc.constant(null),
    fc.constant(undefined)
  );

  // Arbitrary for an answers record (string keys → number|null|undefined)
  const answersArb = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    answerValueArb
  );

  // Arbitrary for a Set<string>
  const markedSetArb = fc.array(fc.string({ minLength: 1, maxLength: 20 })).map(
    (arr) => new Set(arr)
  );

  it("answeredCount equals number of non-null/non-undefined values in answers", () => {
    fc.assert(
      fc.property(answersArb, markedSetArb, fc.nat(), (answers, markedForReview, extraQuestions) => {
        const totalQuestions = Object.keys(answers).length + extraQuestions;
        const { answeredCount } = computeDialogCounts(answers, markedForReview, totalQuestions);
        const expected = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
        expect(answeredCount).toBe(expected);
      })
    );
  });

  it("unansweredCount = totalQuestions - answeredCount", () => {
    fc.assert(
      fc.property(answersArb, markedSetArb, fc.nat(), (answers, markedForReview, extraQuestions) => {
        const totalQuestions = Object.keys(answers).length + extraQuestions;
        const { answeredCount, unansweredCount } = computeDialogCounts(answers, markedForReview, totalQuestions);
        expect(unansweredCount).toBe(totalQuestions - answeredCount);
      })
    );
  });

  it("markedCount = markedForReview.size", () => {
    fc.assert(
      fc.property(answersArb, markedSetArb, fc.nat(), (answers, markedForReview, extraQuestions) => {
        const totalQuestions = Object.keys(answers).length + extraQuestions;
        const { markedCount } = computeDialogCounts(answers, markedForReview, totalQuestions);
        expect(markedCount).toBe(markedForReview.size);
      })
    );
  });

  it("all three counts are consistent with each other", () => {
    fc.assert(
      fc.property(answersArb, markedSetArb, fc.nat(), (answers, markedForReview, extraQuestions) => {
        const totalQuestions = Object.keys(answers).length + extraQuestions;
        const { answeredCount, unansweredCount, markedCount } = computeDialogCounts(
          answers,
          markedForReview,
          totalQuestions
        );
        // unansweredCount + answeredCount must equal totalQuestions
        expect(answeredCount + unansweredCount).toBe(totalQuestions);
        // all counts non-negative
        expect(answeredCount).toBeGreaterThanOrEqual(0);
        expect(unansweredCount).toBeGreaterThanOrEqual(0);
        expect(markedCount).toBeGreaterThanOrEqual(0);
      })
    );
  });
});
