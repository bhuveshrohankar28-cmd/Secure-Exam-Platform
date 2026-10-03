import type { Query } from "firebase-admin/firestore";
import { db } from "../firebase/firebaseAdmin";
import { AuditLog } from "../types/models";

const AUDIT_LOGS = "auditLogs";
const MAX_RESULTS = 500;

/** In-memory fallback for local development (no Firestore configured). */
const inMemoryAuditLogs: AuditLog[] = [];

/**
 * Appends an audit log entry. Used by other services to record important
 * system actions (violations, force-submits, status changes, etc.).
 */
export async function writeAuditLog(entry: AuditLog): Promise<void> {
  if (db) {
    await db.collection(AUDIT_LOGS).doc(entry.id).set(entry);
  } else {
    inMemoryAuditLogs.push(entry);
  }
}

/**
 * GET /api/admin/audit-logs — at least one filter must be supplied.
 *
 * Filter semantics:
 *  - userId   → documents where `userId == filter.userId`
 *  - testId   → documents where `metadata.testId == filter.testId`
 *  - attemptId → documents where `entityId == filter.attemptId`
 *
 * Multiple filters are combined with AND (chained .where() calls).
 * Results are ordered by `timestamp` ascending and capped at 500 entries.
 */
export async function getAuditLogs(filter: {
  userId?: string;
  testId?: string;
  attemptId?: string;
}): Promise<AuditLog[]> {
  if (db) {
    let query: Query = db.collection(AUDIT_LOGS);

    if (filter.userId) {
      query = query.where("userId", "==", filter.userId);
    }
    if (filter.testId) {
      query = query.where("metadata.testId", "==", filter.testId);
    }
    if (filter.attemptId) {
      query = query.where("entityId", "==", filter.attemptId);
    }

    query = query.orderBy("timestamp", "asc").limit(MAX_RESULTS);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AuditLog, "id">),
    }));
  }

  // In-memory fallback
  let logs = inMemoryAuditLogs.slice();

  if (filter.userId) {
    logs = logs.filter((l) => l.userId === filter.userId);
  }
  if (filter.testId) {
    logs = logs.filter(
      (l) => (l.metadata as Record<string, unknown>)?.testId === filter.testId
    );
  }
  if (filter.attemptId) {
    logs = logs.filter((l) => l.entityId === filter.attemptId);
  }

  return logs
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(0, MAX_RESULTS);
}
