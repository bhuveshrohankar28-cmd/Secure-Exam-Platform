import { randomInt } from "crypto";
import { db } from "../firebase/firebaseAdmin";
import { Question, Test, TestStatus } from "../types/models";

/**
 * Storage rule:
 *  - If Firebase is configured, Firestore is the single source of truth.
 *  - Otherwise an in-memory store is used (lost on restart, dev only).
 */
const inMemoryTests = new Map<string, Test>();
const inMemoryQuestions = new Map<string, Question>();

const BATCH_SIZE = 400; // Firestore batches allow 500 operations

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// ------------------------------------------------------------------
// Test codes
// ------------------------------------------------------------------

// No I, O, 0 or 1, so a code read aloud or off a board can't be misread.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Uppercases and strips spaces/dashes, so "k7p-4qx" matches "K7P4QX". */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function findTestByCode(code: string): Promise<Test | null> {
  if (db) {
    const snapshot = await db
      .collection("tests")
      .where("testCode", "==", code)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<Test, "id">) };
  }
  for (const test of inMemoryTests.values()) {
    if ((test as Test & { testCode?: string }).testCode === code) return test;
  }
  return null;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    if (!(await findTestByCode(code))) return code;
  }
  throw new Error("Could not generate a unique test code.");
}

/**
 * Lobby screens poll this every few seconds, so lookups are cached briefly.
 * The cache is cleared on every test write. It is per server process, which
 * is fine for a single backend instance.
 */
const CODE_CACHE_TTL_MS = 3000;
const CODE_CACHE_MAX = 1000;
const codeCache = new Map<string, { test: Test | null; at: number }>();

export async function getTestByCode(input: string): Promise<Test | null> {
  const code = normalizeCode(input);
  if (!code) return null;

  const hit = codeCache.get(code);
  if (hit && Date.now() - hit.at < CODE_CACHE_TTL_MS) return hit.test;

  const test = await findTestByCode(code);
  if (codeCache.size >= CODE_CACHE_MAX) codeCache.clear();
  codeCache.set(code, { test, at: Date.now() });
  return test;
}

/** Gives the test a new code. Old code stops working immediately. */
export async function regenerateTestCode(id: string): Promise<Test | null> {
  const code = await generateUniqueCode();
  return updateTest(id, { testCode: code });
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

async function saveTest(test: Test): Promise<void> {
  if (db) {
    await db.collection("tests").doc(test.id).set(test);
  } else {
    inMemoryTests.set(test.id, test);
  }
  codeCache.clear();
}

export async function createTest(
  data: { title: string; description: string; duration: number },
  createdBy: string
): Promise<Test> {
  const now = new Date().toISOString();
  const test: Test = {
    id: newId("test"),
    testCode: await generateUniqueCode(),
    title: data.title,
    description: data.description,
    duration: data.duration,
    totalMarks: 0,
    questionCount: 0,
    status: "draft",
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await saveTest(test);
  return test;
}

export async function getTestById(id: string): Promise<Test | null> {
  if (db) {
    const doc = await db.collection("tests").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<Test, "id">) };
  }
  return inMemoryTests.get(id) ?? null;
}

export async function listTests(status?: TestStatus): Promise<Test[]> {
  let tests: Test[];

  if (db) {
    const collection = db.collection("tests");
    const snapshot = status
      ? await collection.where("status", "==", status).get()
      : await collection.get();
    tests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Test, "id">),
    }));
  } else {
    tests = Array.from(inMemoryTests.values()).filter(
      (t) => !status || t.status === status
    );
  }

  // Newest first (sorted here so no Firestore composite index is needed)
  return tests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateTest(
  id: string,
  patch: Partial<Omit<Test, "id" | "createdBy" | "createdAt">>
): Promise<Test | null> {
  const existing = await getTestById(id);
  if (!existing) return null;

  const updated: Test = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveTest(updated);
  return updated;
}

/**
 * Deletes a test and all of its questions.
 */
export async function deleteTest(id: string): Promise<boolean> {
  const existing = await getTestById(id);
  if (!existing) return false;

  const questions = await getQuestionsByTestId(id);
  await deleteQuestions(questions);

  if (db) {
    await db.collection("tests").doc(id).delete();
  } else {
    inMemoryTests.delete(id);
  }
  codeCache.clear();
  return true;
}

// ------------------------------------------------------------------
// Questions
// ------------------------------------------------------------------

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  let questions: Question[];

  if (db) {
    const snapshot = await db
      .collection("questions")
      .where("testId", "==", testId)
      .get();
    questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Question, "id">),
    }));
  } else {
    questions = Array.from(inMemoryQuestions.values()).filter(
      (q) => q.testId === testId
    );
  }

  return questions.sort((a, b) => a.order - b.order);
}

async function deleteQuestions(questions: Question[]): Promise<void> {
  if (questions.length === 0) return;

  if (db) {
    for (const group of chunk(questions, BATCH_SIZE)) {
      const batch = db.batch();
      group.forEach((q) => batch.delete(db!.collection("questions").doc(q.id)));
      await batch.commit();
    }
  } else {
    questions.forEach((q) => inMemoryQuestions.delete(q.id));
  }
}

async function writeQuestions(questions: Question[]): Promise<void> {
  if (db) {
    for (const group of chunk(questions, BATCH_SIZE)) {
      const batch = db.batch();
      group.forEach((q) => batch.set(db!.collection("questions").doc(q.id), q));
      await batch.commit();
    }
  } else {
    questions.forEach((q) => inMemoryQuestions.set(q.id, q));
  }
}

export interface NewQuestion {
  text: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

/**
 * Adds questions to a test.
 *  - "append": new questions go after the existing ones
 *  - "replace": existing questions are deleted first
 * questionCount and totalMarks on the test are recalculated.
 */
export async function importQuestions(
  testId: string,
  items: NewQuestion[],
  mode: "append" | "replace"
): Promise<{ test: Test; added: number; replaced: number }> {
  const existing = await getQuestionsByTestId(testId);

  let kept = existing;
  let replaced = 0;
  if (mode === "replace") {
    await deleteQuestions(existing);
    replaced = existing.length;
    kept = [];
  }

  const startOrder = kept.reduce((max, q) => Math.max(max, q.order), 0) + 1;
  const now = new Date().toISOString();

  const created: Question[] = items.map((item, index) => ({
    id: newId("q"),
    testId,
    text: item.text,
    options: item.options,
    correctOptionIndex: item.correctOptionIndex,
    marks: item.marks,
    order: startOrder + index,
    createdAt: now,
    updatedAt: now,
  }));

  await writeQuestions(created);

  const all = [...kept, ...created];
  const test = await updateTest(testId, {
    questionCount: all.length,
    totalMarks: all.reduce((sum, q) => sum + q.marks, 0),
  });

  if (!test) {
    throw new Error("Test disappeared while importing questions.");
  }

  return { test, added: created.length, replaced };
}