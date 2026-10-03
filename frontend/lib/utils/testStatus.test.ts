import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { nextStatuses } from "./testStatus";
import type { TestStatus } from "../../types";

/**
 * Validates: Requirements 8.1
 * Property 11: Test status transition function is exhaustive and correct
 */

const ALL_STATUSES: TestStatus[] = [
  "draft",
  "scheduled",
  "active",
  "completed",
  "archived",
];

const statusArb = fc.constantFrom(...ALL_STATUSES);

describe("nextStatuses — Property 11 (Requirements 8.1)", () => {
  // ----- exact transition sets (example-based) -----

  it("draft transitions to exactly [scheduled, active, archived]", () => {
    expect(nextStatuses("draft")).toEqual(["scheduled", "active", "archived"]);
  });

  it("scheduled transitions to exactly [draft, active, archived]", () => {
    expect(nextStatuses("scheduled")).toEqual(["draft", "active", "archived"]);
  });

  it("active transitions to exactly [completed]", () => {
    expect(nextStatuses("active")).toEqual(["completed"]);
  });

  it("completed transitions to exactly [archived]", () => {
    expect(nextStatuses("completed")).toEqual(["archived"]);
  });

  it("archived has no outgoing transitions", () => {
    expect(nextStatuses("archived")).toEqual([]);
  });

  // ----- property-based tests -----

  it("property: nextStatuses never throws and always returns an array", () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        let result: TestStatus[];
        expect(() => {
          result = nextStatuses(s);
        }).not.toThrow();
        expect(Array.isArray(result!)).toBe(true);
      })
    );
  });

  it("property: no self-transitions — nextStatuses(s) never contains s", () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        const result = nextStatuses(s);
        expect(result.every((t) => t !== s)).toBe(true);
      })
    );
  });

  it("property: all returned statuses are valid TestStatus values", () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        const result = nextStatuses(s);
        expect(result.every((t) => ALL_STATUSES.includes(t))).toBe(true);
      })
    );
  });
});
