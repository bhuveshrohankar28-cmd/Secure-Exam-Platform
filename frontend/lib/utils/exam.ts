/**
 * Exam state helper functions.
 * Requirements: 15.11, 16.2, 16.3, 16.6, 16.7, 17.1, 18.1
 */

/**
 * Pure toggle for the mark-for-review state of a question.
 */
export function toggleReview(current: boolean): boolean {
  return !current;
}

/**
 * Returns the display state for a question nav button based on its flags.
 * Priority order (highest → lowest): current > marked > answered > unanswered
 */
export function questionNavState(flags: {
  isCurrent: boolean;
  isMarkedForReview: boolean;
  isAnswered: boolean;
}): "current" | "marked" | "answered" | "unanswered" {
  if (flags.isCurrent) return "current";
  if (flags.isMarkedForReview) return "marked";
  if (flags.isAnswered) return "answered";
  return "unanswered";
}

/**
 * Counts answered, unanswered, and marked questions from the questions array.
 * The sum of all three counts is guaranteed to equal questions.length.
 */
export function computeSummary(
  questions: Array<{ state: "answered" | "unanswered" | "marked" }>
): { answeredCount: number; unansweredCount: number; markedCount: number } {
  let answeredCount = 0;
  let unansweredCount = 0;
  let markedCount = 0;

  for (const q of questions) {
    if (q.state === "answered") answeredCount++;
    else if (q.state === "marked") markedCount++;
    else unansweredCount++;
  }

  return { answeredCount, unansweredCount, markedCount };
}

/**
 * Derives the counts shown in the submit confirmation dialog from the
 * in-memory answer map and the marked-for-review set.
 *
 * - answeredCount  = number of entries in `answers` whose value is neither null nor undefined
 * - unansweredCount = totalQuestions - answeredCount
 * - markedCount    = markedForReview.size
 */
export function computeDialogCounts(
  answers: Record<string, number | null | undefined>,
  markedForReview: Set<string>,
  totalQuestions: number
): { answeredCount: number; unansweredCount: number; markedCount: number } {
  let answeredCount = 0;

  for (const value of Object.values(answers)) {
    if (value !== null && value !== undefined) {
      answeredCount++;
    }
  }

  return {
    answeredCount,
    unansweredCount: totalQuestions - answeredCount,
    markedCount: markedForReview.size,
  };
}
