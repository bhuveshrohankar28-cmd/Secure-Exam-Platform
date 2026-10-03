import type { Query } from "firebase-admin/firestore";
import { db } from "../firebase/firebaseAdmin";
import { AuditLog, Violation, ViolationType } from "../types/models";

const VIOLATIONS = "violations";
const AUDIT_LOGS = "auditLogs";

const inMemoryViolations = new Map<string, Violation>();
const inMemoryAuditLogs = new Map<string, AuditLog>();

// ------------------------------------------------------------------
// ID helpers
// ------------------------------------------------------------------

/**
 * Generates a violation document ID using the pattern:
 * vio_<attemptId>_<timestamp>_<random suffix>
 *
 * The timestamp + random suffix ensures uniqueness when the same attempt
 * triggers multiple violations in rapid succession.
 */
function violationIdFor(attemptId: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `vio_${attemptId}_${ts}_${rand}`;
}

function auditLogIdFor(violationId: string): string {
  return `log_${violationId}`;
}

// ------------------------------------------------------------------
// Write
// ------------------------------------------------------------------

/**
 * Records a violation + writes a VIOLATION_DETECTED audit log entry.
 * Uses a Firestore batch write so both documents are committed atomically.
 *
 * @param userId - the requesting user's ID (from JWT)
 * @param data - { attemptId, type, metadata? }
 * @returns { id: string, timestamp: string } — the violation document ID and server timestamp
 */
export async function recordViolation(
  userId: string,
  data: {
    attemptId: string;
    type: ViolationType;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id: string; timestamp: string }> {
  const now = new Date().toISOString();
  const violationId = violationIdFor(data.attemptId);
  const auditLogId = auditLogIdFor(violationId);

  const violation: Violation = {
    id: violationId,
    attemptId: data.attemptId,
    userId,
    type: data.type,
    timestamp: now,
    metadata: data.metadata ?? {},
  };

  const auditLog: AuditLog = {
    id: auditLogId,
    userId,
    action: "VIOLATION_DETECTED",
    entityType: "violation",
    entityId: violationId,
    timestamp: now,
    metadata: {
      attemptId: data.attemptId,
      violationType: data.type,
    },
  };

  if (db) {
    // Atomic batch: both documents are committed together or not at all.
    const batch = db.batch();
    batch.set(db.collection(VIOLATIONS).doc(violationId), violation);
    batch.set(db.collection(AUDIT_LOGS).doc(auditLogId), auditLog);
    await batch.commit();
  } else {
    // In-memory fallback for local development (no Firestore configured).
    inMemoryViolations.set(violationId, violation);
    inMemoryAuditLogs.set(auditLogId, auditLog);
  }

  return { id: violationId, timestamp: now };
}

// ------------------------------------------------------------------
// Read
// ------------------------------------------------------------------

/**
 * Returns all violation records for a given attempt, ordered by timestamp ascending.
 */
export async function getViolationsForAttempt(attemptId: string): Promise<Violation[]> {
  let violations: Violation[];

  if (db) {
    const snapshot = await (db.collection(VIOLATIONS) as Query)
      .where("attemptId", "==", attemptId)
      .orderBy("timestamp", "asc")
      .get();
    violations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Violation, "id">),
    }));
  } else {
    violations = Array.from(inMemoryViolations.values())
      .filter((v) => v.attemptId === attemptId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  return violations;
}

/**
 * Returns a map of attemptId → violation count for a given set of attempt IDs.
 *
 * Fetches violations in a single batched query (Firestore `in` operator supports
 * up to 30 values per query; larger sets are chunked automatically) to avoid N+1
 * queries when building the admin attempts list.
 *
 * @param attemptIds - array of attempt IDs to count violations for
 * @returns Map<attemptId, count>; attempt IDs with no violations map to 0
 */
export async function getViolationCountsByAttemptIds(
  attemptIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(attemptIds.map((id) => [id, 0]));

  if (attemptIds.length === 0) return counts;

  // Firestore "in" queries are limited to 30 values per call.
  const CHUNK = 30;

  if (db) {
    for (let i = 0; i < attemptIds.length; i += CHUNK) {
      const chunk = attemptIds.slice(i, i + CHUNK);
      const snapshot = await (db.collection(VIOLATIONS) as Query)
        .where("attemptId", "in", chunk)
        .get();
      snapshot.docs.forEach((doc) => {
        const { attemptId } = doc.data() as { attemptId: string };
        counts.set(attemptId, (counts.get(attemptId) ?? 0) + 1);
      });
    }
  } else {
    for (const violation of inMemoryViolations.values()) {
      if (counts.has(violation.attemptId)) {
        counts.set(violation.attemptId, (counts.get(violation.attemptId) ?? 0) + 1);
      }
    }
  }

  return counts;
}
