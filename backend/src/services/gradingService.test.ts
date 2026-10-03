/**
 * Property-based tests for the backend grading service.
 *
 * Validates: Requirements 10.1, 10.6
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { gradeAttempt, computePercentage } from "./gradingService";
import type { Question, Answer } from "../types/models";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Builds a Question with realistic field shapes. */
const questionArb = fc.record({
  id: fc.uuid(),
  testId: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 10 }),
  options: fc.tuple(fc.string(), fc.string(), fc.string(), fc.string()),
  correctOptionIndex: fc.integer({ min: 0, max: 3 }),
  marks: fc.integer({ min: 1, max: 10 }),
  order: fc.integer({ min: 0, max: 100 }),
  // Timestamps required by the Question interface but not used by grading logic
  createdAt: fc.constant("2024-01-01T00:00:00.000Z"),
  updatedAt: fc.constant("2024-01-01T00:00:00.000Z"),
});

/**
 * Builds an answer array for a given list of questions.
 * Each question may independently have: correct answer, wrong answer, or no answer.
 */
function answersForQuestionsArb(
  questions: Question[]
): fc.Arbitrary<Pick<Answer, "questionId" | "selectedOptionIndex">[]> {
  const perQuestion = questions.map((q) =>
    // 0 = no answer, 1 = correct, 2 = wrong (if ≥ 2 options with wrong possibility)
    fc.integer({ min: 0, max: 2 }).map((mode) => {
      if (mode === 0) return null; // unanswered
      if (mode === 1) return { questionId: q.id, selectedOptionIndex: q.correctOptionIndex };
      // Wrong: pick any option that isn't correct (wrap around)
      const wrong = (q.correctOptionIndex + 1) % 4;
      return { questionId: q.id, selectedOptionIndex: wrong };
    })
  );
  return fc.tuple(...perQuestion).map((entries) =>
    entries.filter((e): e is Pick<Answer, "questionId" | "selectedOptionIndex"> => e !== null)
  );
}

// ---------------------------------------------------------------------------
// Property 7: Grade computation invariants
// Validates: Requirements 10.1
// ---------------------------------------------------------------------------

describe("Property 7: gradeAttempt invariants", () => {
  it("totalMarks equals sum of all question marks", () => {
    fc.assert(
      fc.property(fc.array(questionArb, { minLength: 1, maxLength: 20 }), (questions) => {
        const answers = questions.map((q) => ({
          questionId: q.id,
          selectedOptionIndex: q.correctOptionIndex,
        }));
        const result = gradeAttempt(questions, answers);
        const expectedTotal = questions.reduce((sum, q) => sum + q.marks, 0);
        expect(result.totalMarks).toBe(expectedTotal);
      })
    );
  });

  it("score is always in [0, totalMarks]", () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 1, maxLength: 20 }).chain((questions) =>
          answersForQuestionsArb(questions).map((answers) => ({ questions, answers }))
        ),
        ({ questions, answers }) => {
          const result = gradeAttempt(questions, answers);
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(result.totalMarks);
        }
      )
    );
  });

  it("correctCount is in [0, answeredCount] and answeredCount is in [0, questions.length]", () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 1, maxLength: 20 }).chain((questions) =>
          answersForQuestionsArb(questions).map((answers) => ({ questions, answers }))
        ),
        ({ questions, answers }) => {
          const result = gradeAttempt(questions, answers);
          expect(result.correctCount).toBeGreaterThanOrEqual(0);
          expect(result.correctCount).toBeLessThanOrEqual(result.answeredCount);
          expect(result.answeredCount).toBeGreaterThanOrEqual(0);
          expect(result.answeredCount).toBeLessThanOrEqual(questions.length);
        }
      )
    );
  });

  it("all-correct answers: score equals sum of question marks", () => {
    fc.assert(
      fc.property(fc.array(questionArb, { minLength: 1, maxLength: 20 }), (questions) => {
        const allCorrect = questions.map((q) => ({
          questionId: q.id,
          selectedOptionIndex: q.correctOptionIndex,
        }));
        const result = gradeAttempt(questions, allCorrect);
        const expectedScore = questions.reduce((sum, q) => sum + q.marks, 0);
        expect(result.score).toBe(expectedScore);
        expect(result.correctCount).toBe(questions.length);
        expect(result.answeredCount).toBe(questions.length);
      })
    );
  });

  it("all-wrong answers: score equals 0 and correctCount equals 0", () => {
    fc.assert(
      fc.property(fc.array(questionArb, { minLength: 1, maxLength: 20 }), (questions) => {
        const allWrong = questions.map((q) => ({
          questionId: q.id,
          // Pick an option that is never the correct one
          selectedOptionIndex: (q.correctOptionIndex + 1) % 4,
        }));
        const result = gradeAttempt(questions, allWrong);
        expect(result.score).toBe(0);
        expect(result.correctCount).toBe(0);
        expect(result.answeredCount).toBe(questions.length);
      })
    );
  });

  it("no answers provided: score equals 0 and answeredCount equals 0", () => {
    fc.assert(
      fc.property(fc.array(questionArb, { minLength: 1, maxLength: 20 }), (questions) => {
        const result = gradeAttempt(questions, []);
        expect(result.score).toBe(0);
        expect(result.correctCount).toBe(0);
        expect(result.answeredCount).toBe(0);
        const expectedTotal = questions.reduce((sum, q) => sum + q.marks, 0);
        expect(result.totalMarks).toBe(expectedTotal);
      })
    );
  });

  it("score equals sum of marks for questions answered correctly", () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 1, maxLength: 20 }).chain((questions) =>
          answersForQuestionsArb(questions).map((answers) => ({ questions, answers }))
        ),
        ({ questions, answers }) => {
          const result = gradeAttempt(questions, answers);

          // Compute expected score manually
          const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionIndex]));
          const expectedScore = questions.reduce((sum, q) => {
            const sel = answerMap.get(q.id);
            return sel !== undefined && sel !== null && sel === q.correctOptionIndex
              ? sum + q.marks
              : sum;
          }, 0);

          expect(result.score).toBe(expectedScore);
        }
      )
    );
  });

  it("null selectedOptionIndex is treated as unanswered (score 0 for that question)", () => {
    fc.assert(
      fc.property(fc.array(questionArb, { minLength: 1, maxLength: 20 }), (questions) => {
        const nullAnswers = questions.map((q) => ({
          questionId: q.id,
          selectedOptionIndex: null as number | null,
        }));
        const result = gradeAttempt(questions, nullAnswers);
        expect(result.score).toBe(0);
        expect(result.correctCount).toBe(0);
        expect(result.answeredCount).toBe(0);
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Percentage score formula
// Validates: Requirements 10.6, 11.1
// ---------------------------------------------------------------------------

describe("Property 8: computePercentage formula", () => {
  it("matches Math.round((s / t) * 100 * 10) / 10 for t > 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (score, totalMarks) => {
          const result = computePercentage(score, totalMarks);
          const expected = Math.round((score / totalMarks) * 100 * 10) / 10;
          expect(result).toBe(expected);
        }
      )
    );
  });

  it("returns 0.0 when totalMarks is 0, regardless of score", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (score) => {
        expect(computePercentage(score, 0)).toBe(0.0);
      })
    );
  });

  it("result is always in [0.0, 100.0] when score is in [0, totalMarks]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((total) =>
          fc.integer({ min: 0, max: total }).map((score) => ({ score, total }))
        ),
        ({ score, total }) => {
          const result = computePercentage(score, total);
          expect(result).toBeGreaterThanOrEqual(0.0);
          expect(result).toBeLessThanOrEqual(100.0);
        }
      )
    );
  });
});
