import { Answer, Question } from "../types/models";
 
export interface GradingResult {
  score: number;
  totalMarks: number;
  correctCount: number;
  answeredCount: number;
}
 
/**
 * Pure, server-side grading. The client never sees correctOptionIndex and
 * never sends a score: only the saved answers are compared to the answer key.
 * Unanswered questions (missing or null) score 0. There is no negative marking.
 */
export function gradeAttempt(
  questions: Question[],
  answers: Pick<Answer, "questionId" | "selectedOptionIndex">[]
): GradingResult {
  const selected = new Map<string, number | null>(
    answers.map((a) => [a.questionId, a.selectedOptionIndex])
  );
 
  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let answeredCount = 0;
 
  for (const question of questions) {
    totalMarks += question.marks;
 
    const choice = selected.get(question.id);
    if (choice === undefined || choice === null) continue;
 
    answeredCount++;
    if (choice === question.correctOptionIndex) {
      correctCount++;
      score += question.marks;
    }
  }
 
  return { score, totalMarks, correctCount, answeredCount };
}
 
