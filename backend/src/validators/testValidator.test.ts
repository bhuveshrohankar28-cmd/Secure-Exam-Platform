/**
 * Property 10: Question import validator rejects invalid payloads with per-question errors
 *
 * Validates: Requirements 7.1, 7.3, 7.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateImportPayload } from "./testValidator";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A valid question object as fast-check arbitrary */
const validQuestionArb = fc.record({
  text: fc.string({ minLength: 1, maxLength: 1000 }),
  options: fc.tuple(
    fc.string({ minLength: 1, maxLength: 500 }),
    fc.string({ minLength: 1, maxLength: 500 }),
    fc.string({ minLength: 1, maxLength: 500 }),
    fc.string({ minLength: 1, maxLength: 500 }),
  ),
  correctOptionIndex: fc.integer({ min: 0, max: 3 }),
});

/** Valid question with optional marks field */
const validQuestionWithMarksArb = fc.oneof(
  validQuestionArb,
  fc.record({
    text: fc.string({ minLength: 1, maxLength: 1000 }),
    options: fc.tuple(
      fc.string({ minLength: 1, maxLength: 500 }),
      fc.string({ minLength: 1, maxLength: 500 }),
      fc.string({ minLength: 1, maxLength: 500 }),
      fc.string({ minLength: 1, maxLength: 500 }),
    ),
    correctOptionIndex: fc.integer({ min: 0, max: 3 }),
    marks: fc.float({ min: Math.fround(0.5), max: Math.fround(100), noNaN: true }),
  }),
);

// ---------------------------------------------------------------------------
// Property 10 — tests
// ---------------------------------------------------------------------------

describe("validateImportPayload — Property 10", () => {

  // -------------------------------------------------------------------------
  // Happy path: valid payloads return { valid: true, errors: [] }
  // -------------------------------------------------------------------------

  it("accepts any array of 1–500 valid questions", () => {
    fc.assert(
      fc.property(
        fc.array(validQuestionWithMarksArb, { minLength: 1, maxLength: 500 }),
        (questions) => {
          // Convert tuple to array (fast-check tuples are arrays already)
          const payload = questions.map((q) => ({
            ...q,
            options: Array.from(q.options),
          }));
          const result = validateImportPayload(payload);
          expect(result.valid).toBe(true);
          expect(result.errors).toEqual([]);
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Limit: more than 500 questions is rejected globally
  // -------------------------------------------------------------------------

  it("rejects any payload with more than 500 questions", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 501, max: 600 }),
        (overCount) => {
          // Build a payload of the right length using a constant valid question
          const base = { text: "Valid text", options: ["A", "B", "C", "D"], correctOptionIndex: 0 };
          const payload = Array.from({ length: overCount }, () => ({ ...base }));
          const result = validateImportPayload(payload);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0].index).toBe(0);
          expect(result.errors[0].field).toBe("questions");
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Invalid text: empty string OR longer than 1000 chars → field "text" in errors
  // -------------------------------------------------------------------------

  it("rejects a question with empty text", () => {
    fc.assert(
      fc.property(
        fc.array(validQuestionWithMarksArb, { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        fc.array(validQuestionWithMarksArb, { minLength: 0, maxLength: 10 }),
        (prefix, _unused, suffix) => {
          const badQuestion = {
            text: "",
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0,
          };
          const payload = [
            ...prefix.map((q) => ({ ...q, options: Array.from(q.options) })),
            badQuestion,
            ...suffix.map((q) => ({ ...q, options: Array.from(q.options) })),
          ];
          const badIndex = prefix.length + 1; // 1-based
          const result = validateImportPayload(payload);
          expect(result.valid).toBe(false);
          const textError = result.errors.find(
            (e) => e.index === badIndex && e.field === "text"
          );
          expect(textError).toBeDefined();
        }
      )
    );
  });

  it("rejects a question with text longer than 1000 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1001, maxLength: 1200 }),
        fc.array(validQuestionWithMarksArb, { minLength: 0, maxLength: 5 }),
        (longText, suffix) => {
          const badQuestion = {
            text: longText,
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0,
          };
          const payload = [
            badQuestion,
            ...suffix.map((q) => ({ ...q, options: Array.from(q.options) })),
          ];
          const result = validateImportPayload(payload);
          expect(result.valid).toBe(false);
          const textError = result.errors.find(
            (e) => e.index === 1 && e.field === "text"
          );
          expect(textError).toBeDefined();
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Invalid options: wrong count → field "options" or "options[j]" in errors
  // -------------------------------------------------------------------------

  it("rejects a question with fewer than 4 options", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 0, maxLength: 3 }),
        (shortOptions) => {
          const badQuestion = {
            text: "Valid question text",
            options: shortOptions,
            correctOptionIndex: 0,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const optError = result.errors.find(
            (e) => e.index === 1 && e.field.startsWith("options")
          );
          expect(optError).toBeDefined();
        }
      )
    );
  });

  it("rejects a question with more than 4 options", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 5, maxLength: 8 }),
        (longOptions) => {
          const badQuestion = {
            text: "Valid question text",
            options: longOptions,
            correctOptionIndex: 0,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const optError = result.errors.find(
            (e) => e.index === 1 && e.field.startsWith("options")
          );
          expect(optError).toBeDefined();
        }
      )
    );
  });

  it("rejects a question where one option is empty", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        (emptyAt) => {
          const opts = ["A", "B", "C", "D"];
          opts[emptyAt] = "";
          const badQuestion = {
            text: "Valid text",
            options: opts,
            correctOptionIndex: 0,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const optError = result.errors.find(
            (e) => e.index === 1 && e.field.startsWith("options")
          );
          expect(optError).toBeDefined();
        }
      )
    );
  });

  it("rejects a question where one option exceeds 500 characters", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.string({ minLength: 501, maxLength: 600 }),
        (badAt, longOpt) => {
          const opts = ["A", "B", "C", "D"];
          opts[badAt] = longOpt;
          const badQuestion = {
            text: "Valid text",
            options: opts,
            correctOptionIndex: 0,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const optError = result.errors.find(
            (e) => e.index === 1 && e.field.startsWith("options")
          );
          expect(optError).toBeDefined();
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Invalid correctOptionIndex: outside 0–3 → field "correctOptionIndex"
  // -------------------------------------------------------------------------

  it("rejects a question with correctOptionIndex outside 0–3", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 4, max: 100 }),
          fc.integer({ min: -100, max: -1 }),
        ),
        (badIndex) => {
          const badQuestion = {
            text: "Valid text",
            options: ["A", "B", "C", "D"],
            correctOptionIndex: badIndex,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const err = result.errors.find(
            (e) => e.index === 1 && e.field === "correctOptionIndex"
          );
          expect(err).toBeDefined();
        }
      )
    );
  });

  it("rejects a question with non-integer correctOptionIndex", () => {
    fc.assert(
      fc.property(
        // Generate a float in (0, 3) that is not a whole number
        fc.float({ min: Math.fround(0.1), max: Math.fround(3.9), noNaN: true }).filter((v) => !Number.isInteger(v)),
        (nonInt) => {
          const badQuestion = {
            text: "Valid text",
            options: ["A", "B", "C", "D"],
            correctOptionIndex: nonInt,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const err = result.errors.find(
            (e) => e.index === 1 && e.field === "correctOptionIndex"
          );
          expect(err).toBeDefined();
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Invalid marks (when present): outside 0.5–100 → field "marks"
  // -------------------------------------------------------------------------

  it("rejects a question with marks below 0.5", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.499), noNaN: true }),
        (lowMarks) => {
          const badQuestion = {
            text: "Valid text",
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0,
            marks: lowMarks,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const err = result.errors.find(
            (e) => e.index === 1 && e.field === "marks"
          );
          expect(err).toBeDefined();
        }
      )
    );
  });

  it("rejects a question with marks above 100", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100.01), max: Math.fround(200), noNaN: true }),
        (highMarks) => {
          const badQuestion = {
            text: "Valid text",
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0,
            marks: highMarks,
          };
          const result = validateImportPayload([badQuestion]);
          expect(result.valid).toBe(false);
          const err = result.errors.find(
            (e) => e.index === 1 && e.field === "marks"
          );
          expect(err).toBeDefined();
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Error indices are 1-based
  // -------------------------------------------------------------------------

  it("error index is 1-based (first question has index 1, not 0)", () => {
    const badQuestion = {
      text: "", // invalid — triggers text error
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
    };
    const result = validateImportPayload([badQuestion]);
    expect(result.valid).toBe(false);
    expect(result.errors.every((e) => e.index >= 1)).toBe(true);
    expect(result.errors.some((e) => e.index === 1)).toBe(true);
  });

  it("error index corresponds to the 1-based position of the bad question in the array", () => {
    fc.assert(
      fc.property(
        fc.array(validQuestionWithMarksArb, { minLength: 0, maxLength: 10 }),
        (prefix) => {
          const badQuestion = {
            text: "", // always invalid
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0,
          };
          const payload = [
            ...prefix.map((q) => ({ ...q, options: Array.from(q.options) })),
            badQuestion,
          ];
          const expectedIndex = prefix.length + 1; // 1-based
          const result = validateImportPayload(payload);
          expect(result.valid).toBe(false);
          const textErr = result.errors.find(
            (e) => e.index === expectedIndex && e.field === "text"
          );
          expect(textErr).toBeDefined();
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Any invalid question in the array causes valid: false for the entire payload
  // -------------------------------------------------------------------------

  it("rejects the entire payload if any single question is invalid", () => {
    fc.assert(
      fc.property(
        // A non-empty prefix of valid questions
        fc.array(validQuestionWithMarksArb, { minLength: 0, maxLength: 10 }),
        // A non-empty suffix of valid questions
        fc.array(validQuestionWithMarksArb, { minLength: 0, maxLength: 10 }),
        (prefix, suffix) => {
          const badQuestion = {
            text: "", // always invalid
            options: ["A", "B", "C", "D"],
            correctOptionIndex: 0,
          };
          const payload = [
            ...prefix.map((q) => ({ ...q, options: Array.from(q.options) })),
            badQuestion,
            ...suffix.map((q) => ({ ...q, options: Array.from(q.options) })),
          ];
          const result = validateImportPayload(payload);
          // Even though prefix and suffix are all valid, one bad question rejects all
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  // -------------------------------------------------------------------------
  // Multiple invalid questions: all are reported, not just the first
  // -------------------------------------------------------------------------

  it("reports errors for all invalid questions, not just the first", () => {
    const payload = [
      { text: "", options: ["A", "B", "C", "D"], correctOptionIndex: 0 },      // invalid: text
      { text: "Valid", options: ["A", "B", "C", "D"], correctOptionIndex: 5 }, // invalid: correctOptionIndex
    ];
    const result = validateImportPayload(payload);
    expect(result.valid).toBe(false);
    const indices = result.errors.map((e) => e.index);
    expect(indices).toContain(1);
    expect(indices).toContain(2);
  });
});
