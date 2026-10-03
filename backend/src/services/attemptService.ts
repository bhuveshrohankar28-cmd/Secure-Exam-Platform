import type { Query } from "firebase-admin/firestore";
import { db } from "../firebase/firebaseAdmin";
import { Answer, AttemptStatus, TestAttempt } from "../types/models";
import { getQuestionsByTestId } from "./testService";
import { updateLastSeen } from "./userService";
import { gradeAttempt } from "./gradingService";

/**
 * Storage rule (same as testService): Firestore when configured,
 * otherwise in-memory for local development.
 */
const inMemoryAttempts = new Map<string, TestAttempt>();
const inMemoryAnswers = new Map<string, Answer>();

const ATTEMPTS = "testAttempts";
const ANSWERS = "answers";
const BATCH_SIZE = 400;

/** Extra seconds allowed after the timer ends, for slow networks. */
export const GRACE_MS = 15_000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * The attempt ID is derived from test + student. Because it is also the
 * database document ID, "one attempt per student per test" is enforced by
 * the database itself, even if a student double-taps Start.
 */
export function attemptIdFor(testId: string, userId: string): string {
  return `att_${testId}_${userId}`;
}

// ------------------------------------------------------------------
// Timing
// ------------------------------------------------------------------

export function remainingMs(attempt: TestAttempt): number {
  return new Date(attempt.endsAt).getTime() - Date.now();
}

/** True once the timer AND the grace period are both over. */
export function isPastGrace(attempt: TestAttempt): boolean {
  return remainingMs(attempt) < -GRACE_MS;
}

// ------------------------------------------------------------------
// What the API returns about an attempt
// ------------------------------------------------------------------

export function toAttemptView(attempt: TestAttempt) {
  return {
    id: attempt.id,
    testTitle: attempt.testTitle,
    status: attempt.status,
    startedAt: attempt.startedAt,
    endsAt: attempt.endsAt,
    submittedAt: attempt.submittedAt,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    correctCount: attempt.correctCount,
    answeredCount: attempt.answeredCount,
  };
}

// ------------------------------------------------------------------
// Attempts
// ------------------------------------------------------------------

export async function getAttempt(id: string): Promise<TestAttempt | null> {
  if (db) {
    const doc = await db.collection(ATTEMPTS).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<TestAttempt, "id">) };
  }
  return inMemoryAttempts.get(id) ?? null;
}

async function saveAttempt(attempt: TestAttempt): Promise<void> {
  if (db) {
    await db.collection(ATTEMPTS).doc(attempt.id).set(attempt);
  } else {
    inMemoryAttempts.set(attempt.id, attempt);
  }
}

/**
 * Creates the attempt only if none exists yet. If one already exists
 * (double tap, resume after refresh) the existing one is returned.
 */
export async function createAttemptIfAbsent(
  attempt: TestAttempt
): Promise<{ attempt: TestAttempt; created: boolean }> {
  if (db) {
    const ref = db.collection(ATTEMPTS).doc(attempt.id);
    try {
      await ref.create(attempt);
      return { attempt, created: true };
    } catch (error) {
      // gRPC code 6 = ALREADY_EXISTS
      if ((error as { code?: number }).code === 6) {
        const doc = await ref.get();
        return {
          attempt: { id: doc.id, ...(doc.data() as Omit<TestAttempt, "id">) },
          created: false,
        };
      }
      throw error;
    }
  }

  const existing = inMemoryAttempts.get(attempt.id);
  if (existing) return { attempt: existing, created: false };
  inMemoryAttempts.set(attempt.id, attempt);
  return { attempt, created: true };
}

export async function listAttempts(
  filter: { testId?: string; userId?: string; status?: AttemptStatus } = {}
): Promise<TestAttempt[]> {
  let attempts: TestAttempt[];

  if (db) {
    let query: Query = db.collection(ATTEMPTS);
    if (filter.testId) query = query.where("testId", "==", filter.testId);
    if (filter.userId) query = query.where("userId", "==", filter.userId);
    if (filter.status) query = query.where("status", "==", filter.status);
    const snapshot = await query.get();
    attempts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TestAttempt, "id">),
    }));
  } else {
    attempts = Array.from(inMemoryAttempts.values()).filter(
      (a) =>
        (!filter.testId || a.testId === filter.testId) &&
        (!filter.userId || a.userId === filter.userId) &&
        (!filter.status || a.status === filter.status)
    );
  }

  return attempts.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ------------------------------------------------------------------
// Answers
// ------------------------------------------------------------------

export async function getAnswers(attemptId: string): Promise<Answer[]> {
  if (db) {
    const snapshot = await db
      .collection(ANSWERS)
      .where("attemptId", "==", attemptId)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Answer, "id">),
    }));
  }
  return Array.from(inMemoryAnswers.values()).filter(
    (a) => a.attemptId === attemptId
  );
}

export async function upsertAnswers(
  attempt: TestAttempt,
  items: { questionId: string; selectedOptionIndex: number | null }[]
): Promise<void> {
  if (items.length === 0) return;

  const now = new Date().toISOString();
  const docs: Answer[] = items.map((item) => ({
    id: `${attempt.id}_${item.questionId}`,
    attemptId: attempt.id,
    questionId: item.questionId,
    userId: attempt.userId,
    selectedOptionIndex: item.selectedOptionIndex,
    answeredAt: now,
  }));

  if (db) {
    for (const group of chunk(docs, BATCH_SIZE)) {
      const batch = db.batch();
      group.forEach((a) => batch.set(db!.collection(ANSWERS).doc(a.id), a));
      await batch.commit();
    }
  } else {
    docs.forEach((a) => inMemoryAnswers.set(a.id, a));
  }
}

/** Admin reset: removes the attempt and its answers so the student can retake. */
export async function deleteAttemptAndAnswers(id: string): Promise<boolean> {
  const attempt = await getAttempt(id);
  if (!attempt) return false;

  const answers = await getAnswers(id);

  if (db) {
    for (const group of chunk(answers, BATCH_SIZE)) {
      const batch = db.batch();
      group.forEach((a) => batch.delete(db!.collection(ANSWERS).doc(a.id)));
      await batch.commit();
    }
    await db.collection(ATTEMPTS).doc(id).delete();
  } else {
    answers.forEach((a) => inMemoryAnswers.delete(a.id));
    inMemoryAttempts.delete(id);
  }
  return true;
}

// ------------------------------------------------------------------
// Question IDs (cached, used to validate autosaves cheaply)
// ------------------------------------------------------------------

const QUESTION_CACHE_TTL_MS = 5 * 60 * 1000;
const questionIdCache = new Map<string, { ids: Set<string>; at: number }>();

/**
 * Questions cannot change while a test is active, so autosaves check answers
 * against a cached set of question IDs instead of re-reading every question.
 */
export async function getQuestionIdSet(testId: string): Promise<Set<string>> {
  const hit = questionIdCache.get(testId);
  if (hit && Date.now() - hit.at < QUESTION_CACHE_TTL_MS) return hit.ids;

  const questions = await getQuestionsByTestId(testId);
  const ids = new Set(questions.map((q) => q.id));
  questionIdCache.set(testId, { ids, at: Date.now() });
  return ids;
}

// ------------------------------------------------------------------
// Finishing an attempt
// ------------------------------------------------------------------

/**
 * Grades and closes an attempt. Safe to call more than once: if the attempt
 * is already finished, the stored result is returned unchanged.
 */
export async function finalizeAttempt(attempt: TestAttempt): Promise<TestAttempt> {
  const fresh = await getAttempt(attempt.id);
  if (!fresh) throw new Error("Attempt not found.");
  if (fresh.status !== "in_progress") return fresh;

  const [questions, answers] = await Promise.all([
    getQuestionsByTestId(fresh.testId),
    getAnswers(fresh.id),
  ]);
  const result = gradeAttempt(questions, answers);

  const now = Date.now();
  // A student who never came back is recorded as submitting when time ran out.
  const submittedAt = new Date(
    Math.min(now, new Date(fresh.endsAt).getTime())
  ).toISOString();

  const graded: TestAttempt = {
    ...fresh,
    status: "graded",
    submittedAt,
    gradedAt: new Date(now).toISOString(),
    ...result,
  };
  await saveAttempt(graded);
  return graded;
}

/** Closes every attempt whose timer and grace period are over. */
export async function finalizeExpiredAttempts(): Promise<number> {
  const running = await listAttempts({ status: "in_progress" });
  let closed = 0;
  for (const attempt of running) {
    if (isPastGrace(attempt)) {
      await finalizeAttempt(attempt);
      closed++;
    }
  }
  return closed;
}

/**
 * Students who close the tab and never return would otherwise stay
 * "in_progress" forever. This closes them shortly after time runs out.
 */
export function startExpirySweeper(intervalMs = 30_000): void {
  const timer = setInterval(() => {
    finalizeExpiredAttempts().catch((error) =>
      console.error("[AttemptSweeper] failed:", error)
    );
  }, intervalMs);
  timer.unref();
}

// ------------------------------------------------------------------
// Presence (replaces the separate heartbeat during an exam)
// ------------------------------------------------------------------

const lastPresenceWrite = new Map<string, number>();

/** Updates lastSeen at most once a minute per student. */
export async function touchPresence(userId: string): Promise<void> {
  const now = Date.now();
  if (now - (lastPresenceWrite.get(userId) ?? 0) < 60_000) return;
  lastPresenceWrite.set(userId, now);
  await updateLastSeen(userId).catch(() => undefined);
}