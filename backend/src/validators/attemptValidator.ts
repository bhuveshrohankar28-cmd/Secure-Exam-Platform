import { z } from "zod";

/** POST /api/attempts — the student starts (or resumes) a test using its code. */
export const startAttemptSchema = z.object({
  code: z.string().trim().min(3).max(20),
});

const answerItemSchema = z.object({
  questionId: z.string().min(1).max(200),
  // null = the student cleared / skipped the question
  selectedOptionIndex: z.number().int().min(0).max(3).nullable(),
});

/** POST /api/attempts/:id/answers — autosave. */
export const saveAnswersSchema = z.object({
  answers: z.array(answerItemSchema).min(1).max(500),
});

/** POST /api/attempts/:id/submit — optionally carries the last unsaved answers. */
export const submitSchema = z.object({
  answers: z.array(answerItemSchema).max(500).optional(),
});

export type AnswerInput = z.infer<typeof answerItemSchema>;