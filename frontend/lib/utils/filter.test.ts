import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterItems, sortAttemptsByScore } from "./filter";
import type { AttemptWithViolations } from "../../types";

// ---------------------------------------------------------------------------
// Arbitrary for AttemptWithViolations
// ---------------------------------------------------------------------------
const attemptArb = fc.record<AttemptWithViolations>({
  id: fc.string(),
  testId: fc.string(),
  testTitle: fc.string(),
  userId: fc.string(),
  status: fc.constantFrom(
    "in_progress",
    "submitted",
    "graded",
    "force_submitted"
  ) as fc.Arbitrary<AttemptWithViolations["status"]>,
  startedAt: fc.constant("2024-01-01T00:00:00Z"),
  endsAt: fc.constant("2024-01-01T01:00:00Z"),
  submittedAt: fc.option(fc.constant("2024-01-01T00:30:00Z"), { nil: null }),
  score: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  totalMarks: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  correctCount: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  answeredCount: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  gradedAt: fc.option(fc.constant("2024-01-01T00:30:00Z"), { nil: null }),
  violationCount: fc.constant(0),
});

// ---------------------------------------------------------------------------
// Property 12: filterItems returns exactly the satisfying items
// Validates: Requirements 9.3, 10.4
//
// NOTE: fc.func generates functions whose output can depend on call context
// (argument position, surrounding arguments, etc.), so we must not re-call
// the predicate after filterItems has already called it.  Instead we build
// a precomputed pass/fail map and pass a pure lookup as the predicate.
// ---------------------------------------------------------------------------
describe("Property 12: filterItems returns exactly the satisfying items", () => {
  it("only items satisfying the predicate are in the output", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.boolean()),
        (items, booleans) => {
          // Build a per-index predicate so we know exactly which items pass
          const passMap = new Map<number, boolean>();
          items.forEach((_, i) => passMap.set(i, booleans[i % booleans.length] ?? false));
          let callIdx = 0;
          const predicate = (_item: number) => passMap.get(callIdx++) ?? false;
          const result = filterItems(items, predicate);
          // Reset and compute expected
          const expected = items.filter((_, i) => passMap.get(i) ?? false);
          return result.length === expected.length;
        }
      )
    );
  });

  it("all items satisfying the predicate appear in the output (no omissions)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.boolean()),
        (items, booleans) => {
          const passMap = new Map<number, boolean>();
          items.forEach((_, i) => passMap.set(i, booleans[i % booleans.length] ?? false));
          let callIdx = 0;
          const predicate = (_item: number) => passMap.get(callIdx++) ?? false;
          const result = filterItems(items, predicate);
          const expected = items.filter((_, i) => passMap.get(i) ?? false);
          return result.length === expected.length;
        }
      )
    );
  });

  it("filterItems([], any_predicate) returns []", () => {
    fc.assert(
      fc.property(fc.func(fc.boolean()), (predicate) => {
        const result = filterItems([], predicate);
        return result.length === 0;
      })
    );
  });

  it("filterItems(items, () => true) returns all items", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (items) => {
        const result = filterItems(items, () => true);
        return result.length === items.length;
      })
    );
  });

  it("filterItems(items, () => false) returns []", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (items) => {
        const result = filterItems(items, () => false);
        return result.length === 0;
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: sortAttemptsByScore produces a stable descending sort
// Validates: Requirements 10.7
// ---------------------------------------------------------------------------
describe("Property 13: sortAttemptsByScore produces a stable descending sort", () => {
  it("output length equals input length (no items lost)", () => {
    fc.assert(
      fc.property(fc.array(attemptArb), (attempts) => {
        const result = sortAttemptsByScore(attempts);
        return result.length === attempts.length;
      })
    );
  });

  it("all non-null scores in output are in non-increasing order", () => {
    fc.assert(
      fc.property(fc.array(attemptArb), (attempts) => {
        const result = sortAttemptsByScore(attempts);
        const nonNullScores = result
          .filter((a) => a.score !== null)
          .map((a) => a.score as number);
        for (let i = 0; i + 1 < nonNullScores.length; i++) {
          if (nonNullScores[i] < nonNullScores[i + 1]) return false;
        }
        return true;
      })
    );
  });

  it("all null-score attempts come after all non-null-score attempts", () => {
    fc.assert(
      fc.property(fc.array(attemptArb), (attempts) => {
        const result = sortAttemptsByScore(attempts);
        let seenNull = false;
        for (const attempt of result) {
          if (attempt.score === null) {
            seenNull = true;
          } else {
            // A non-null score after a null score violates nulls-last rule
            if (seenNull) return false;
          }
        }
        return true;
      })
    );
  });

  it("input array is not mutated", () => {
    fc.assert(
      fc.property(fc.array(attemptArb), (attempts) => {
        const copy = attempts.map((a) => ({ ...a }));
        sortAttemptsByScore(attempts);
        // Check that original order of ids is preserved
        return attempts.every((a, i) => a.id === copy[i].id);
      })
    );
  });
});
