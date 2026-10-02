import { z } from "zod";

export const MAX_QUESTIONS_PER_TEST = 500;

export const testStatusSchema = z.enum([
  "draft",
  "scheduled",
  "active",
  "completed",
  "archived",
]);

const title = z.string().trim().min(3).max(100);
const description = z.string().trim().max(2000);
const duration = z.number().int().min(1).max(300); // minutes

/**
 * POST /api/tests
 * totalMarks is NOT accepted: it is calculated from the imported questions.
 */
export const createTestSchema = z.object({
  title,
  description: description.default(""),
  duration,
});

/**
 * PUT /api/tests/:id
 */
export const updateTestSchema = z
  .object({
    title,
    description,
    duration,
    status: testStatusSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

/**
 * One MCQ question inside the import JSON.
 */
export const questionSchema = z
  .object({
    text: z.string().trim().min(3).max(2000),
    options: z.array(z.string().trim().min(1).max(500)).length(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    marks: z.number().int().min(1).max(100).default(1),
  })
  .refine(
    (q) => new Set(q.options.map((o) => o.toLowerCase())).size === q.options.length,
    { message: "The 4 options must all be different.", path: ["options"] }
  );

export type QuestionInput = z.infer<typeof questionSchema>;

/**
 * POST /api/tests/:id/questions/import
 *
 * Body: { "mode": "append" | "replace", "questions": [ ... ] }
 * A plain array of questions is also accepted (handled in the controller).
 * Each question is validated separately in the controller so the admin gets
 * one error per bad question.
 */
export const importQuestionsSchema = z.object({
  mode: z.enum(["append", "replace"]).default("append"),
  questions: z.array(z.unknown()).min(1).max(MAX_QUESTIONS_PER_TEST),
});

export function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}