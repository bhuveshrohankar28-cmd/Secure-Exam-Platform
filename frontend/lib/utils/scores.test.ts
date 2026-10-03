/**
 * Property-based tests for the percentage score formula.
 *
 * **Validates: Requirements 10.6**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computePercentage } from "./scores";

describe("computePercentage — Property 8: Percentage score formula", () => {
  it("matches Math.round((s / t) * 100 * 10) / 10 for any t > 0 and 0 ≤ s ≤ 200", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),   // totalMarks > 0
        fc.integer({ min: 0, max: 200 }),   // score (may exceed totalMarks — formula still defined)
        (totalMarks, score) => {
          const expected = Math.round((score / totalMarks) * 100 * 10) / 10;
          expect(computePercentage(score, totalMarks)).toBe(expected);
        }
      )
    );
  });

  it("returns 0.0 for any score when totalMarks is 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: 200 }), // any score, including negatives
        (score) => {
          expect(computePercentage(score, 0)).toBe(0.0);
        }
      )
    );
  });

  it("always returns a finite number", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        (score, totalMarks) => {
          const result = computePercentage(score, totalMarks);
          expect(Number.isFinite(result)).toBe(true);
        }
      )
    );
  });
});
