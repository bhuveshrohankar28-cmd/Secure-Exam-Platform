import type { Query } from "firebase-admin/firestore";
import { db } from "../firebase/firebaseAdmin";
import { TestAccess } from "../types/models";
import { getTestById } from "./testService";

const COLLECTION = "testAccess";
const inMemoryAccess = new Map<string, TestAccess>();

export async function listTestAccess(
  filter: { testId?: string; userId?: string } = {}
): Promise<TestAccess[]> {
  if (db) {
    let query: Query = db.collection(COLLECTION);
    if (filter.testId) query = query.where("testId", "==", filter.testId);
    else if (filter.userId) query = query.where("userId", "==", filter.userId);
    const snapshot = await query.get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<TestAccess, "id">) }))
      .filter((access) => !filter.userId || access.userId === filter.userId)
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  }

  return Array.from(inMemoryAccess.values())
    .filter((access) =>
      (!filter.testId || access.testId === filter.testId) &&
      (!filter.userId || access.userId === filter.userId)
    )
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
}

export async function hasTestAccess(testId: string, userId: string): Promise<boolean> {
  const grants = await listTestAccess({ testId, userId });
  return grants.some((grant) => grant.status === "allowed");
}

export async function getStudentAccessibleTests(userId: string) {
  const grants = await listTestAccess({ userId });
  const testIds = Array.from(new Set(
    grants.filter((grant) => grant.status === "allowed").map((grant) => grant.testId)
  ));
  const tests = await Promise.all(testIds.map((id) => getTestById(id)));
  return tests.filter((test) => test && test.status !== "draft" && test.status !== "archived");
}

export async function grantTestAccess(
  testId: string,
  userId: string,
  grantedBy: string
): Promise<TestAccess> {
  const id = `access_${testId}_${userId}`;
  const access: TestAccess = {
    id,
    testId,
    userId,
    status: "allowed",
    grantedAt: new Date().toISOString(),
    grantedBy,
    revokedAt: null,
  };

  if (db) {
    await db.collection(COLLECTION).doc(id).set(access);
  } else {
    inMemoryAccess.set(id, access);
  }
  return access;
}

export async function revokeTestAccess(id: string): Promise<TestAccess | null> {
  let existing: TestAccess | undefined;
  if (db) {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (doc.exists) existing = { id: doc.id, ...(doc.data() as Omit<TestAccess, "id">) };
  } else {
    existing = inMemoryAccess.get(id);
  }
  if (!existing) return null;

  const revoked: TestAccess = {
    ...existing,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  };
  if (db) {
    await db.collection(COLLECTION).doc(id).set(revoked);
  } else {
    inMemoryAccess.set(id, revoked);
  }
  return revoked;
}
