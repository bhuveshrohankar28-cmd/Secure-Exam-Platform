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

/**
 * Structured error for a single failing field within an import question.
 */
export interface ImportValidationError {
  index: number;
  field: string;
  message: string;
}

/**
 * Result returned by validateImportPayload.
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: ImportValidationError[];
}

/**
 * Validates a raw array of question payloads for bulk import.
 *
 * Rules per question (1-based index in errors):
 *   - text:               string, 1–1000 characters
 *   - options:            array of exactly 4 strings, each 1–500 characters
 *   - correctOptionIndex: integer 0–3
 *   - marks:              optional number; if present, must be in range 0.5–100
 *
 * The entire payload is rejected (valid: false) if ANY question fails.
 * Maximum 500 questions per import.
 */
export function validateImportPayload(questions: unknown[]): ImportValidationResult {
  const errors: ImportValidationError[] = [];

  // Hard limit on total questions
  if (questions.length > 500) {
    return {
      valid: false,
      errors: [{ index: 0, field: "questions", message: "Maximum 500 questions per import" }],
    };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const oneBasedIndex = i + 1;

    if (q === null || typeof q !== "object" || Array.isArray(q)) {
      errors.push({ index: oneBasedIndex, field: "question", message: "Each question must be an object" });
      continue;
    }

    const question = q as Record<string, unknown>;

    // Validate: text
    const text = question["text"];
    if (typeof text !== "string") {
      errors.push({ index: oneBasedIndex, field: "text", message: "text must be a string" });
    } else if (text.length < 1 || text.length > 1000) {
      errors.push({ index: oneBasedIndex, field: "text", message: "text must be between 1 and 1000 characters" });
    }

    // Validate: options
    const options = question["options"];
    if (!Array.isArray(options)) {
      errors.push({ index: oneBasedIndex, field: "options", message: "options must be an array of exactly 4 strings" });
    } else if (options.length !== 4) {
      errors.push({ index: oneBasedIndex, field: "options", message: "options must contain exactly 4 items" });
    } else {
      for (let j = 0; j < options.length; j++) {
        const opt = options[j];
        if (typeof opt !== "string") {
          errors.push({ index: oneBasedIndex, field: `options[${j}]`, message: `option at index ${j} must be a string` });
        } else if (opt.length < 1 || opt.length > 500) {
          errors.push({ index: oneBasedIndex, field: `options[${j}]`, message: `option at index ${j} must be between 1 and 500 characters` });
        }
      }
    }

    // Validate: correctOptionIndex
    const correctOptionIndex = question["correctOptionIndex"];
    if (
      typeof correctOptionIndex !== "number" ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      errors.push({ index: oneBasedIndex, field: "correctOptionIndex", message: "correctOptionIndex must be an integer between 0 and 3" });
    }

    // Validate: marks (optional)
    if (Object.prototype.hasOwnProperty.call(question, "marks") && question["marks"] !== undefined) {
      const marks = question["marks"];
      if (typeof marks !== "number" || marks < 0.5 || marks > 100) {
        errors.push({ index: oneBasedIndex, field: "marks", message: "marks must be a number between 0.5 and 100" });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}