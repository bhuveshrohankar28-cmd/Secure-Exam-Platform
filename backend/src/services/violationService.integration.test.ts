/**
 * Integration tests for violationService (in-memory path)
 *
 * Feature: exam-lobby-admin-panel
 * Validates: Requirements 11.1, 11.3, 11.4
 *
 * Firestore is replaced with the in-memory fallback by mocking `db` to null.
 * All tests exercise the real service logic without network I/O.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must come before the module import so the mock is applied first.
// ---------------------------------------------------------------------------

vi.mock("../firebase/firebaseAdmin", () => ({ db: null }));

// We import the module under test AFTER setting up the mock so the in-memory
// Maps are used throughout.
import {
  recordViolation,
  getViolationsForAttempt,
} from "./violationService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a fresh unique attempt ID for each test so state doesn't bleed. */
let counter = 0;
function freshAttemptId(): string {
  return `att_inttest_${++counter}`;
}

function freshUserId(): string {
  return `user_inttest_${counter}`;
}

/** Returns true if the string is a non-empty, valid ISO 8601 UTC date. */
function isValidISOTimestamp(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString() === value;
}

// ---------------------------------------------------------------------------
// Clear in-memory state between tests
// ---------------------------------------------------------------------------
//
// The violationService module uses module-level Maps. Vitest keeps modules
// alive across tests in the same file, so we reset by re-importing a fresh
// module isolation. The simplest portable approach is to call the module's
// own in-memory map via the behavior under test (i.e., verify isolation by
// using unique attempt IDs per test — no shared state issues).

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("violationService integration tests", () => {
  // -------------------------------------------------------------------------
  // Test 1: recordViolation atomicity — both violations are stored and
  //         returned by getViolationsForAttempt, ordered by timestamp asc.
  // -------------------------------------------------------------------------
  it("records two violations atomically and returns them in ascending timestamp order", async () => {
    // Validates: Requirements 11.1, 11.2
    const attemptId = freshAttemptId();
    const userId = freshUserId();

    const result1 = await recordViolation(userId, {
      attemptId,
      type: "tab_switch",
      metadata: { source: "first" },
    });

    // Small artificial gap so timestamps differ and ordering is stable.
    await new Promise((r) => setTimeout(r, 5));

    const result2 = await recordViolation(userId, {
      attemptId,
      type: "window_blur",
      metadata: { source: "second" },
    });

    const violations = await getViolationsForAttempt(attemptId);

    expect(violations).toHaveLength(2);

    // The first returned violation must have the earlier timestamp.
    expect(violations[0].id).toBe(result1.id);
    expect(violations[1].id).toBe(result2.id);
    expect(violations[0].timestamp <= violations[1].timestamp).toBe(true);

    // Both violation types are present.
    expect(violations[0].type).toBe("tab_switch");
    expect(violations[1].type).toBe("window_blur");
  });

  // -------------------------------------------------------------------------
  // Test 2: recordViolation returns a non-empty id and a valid ISO timestamp.
  // -------------------------------------------------------------------------
  it("returns a non-empty id string and a valid ISO 8601 timestamp", async () => {
    // Validates: Requirements 11.1, 11.2
    const attemptId = freshAttemptId();
    const userId = freshUserId();

    const result = await recordViolation(userId, {
      attemptId,
      type: "copy_attempt",
      metadata: {},
    });

    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);

    expect(typeof result.timestamp).toBe("string");
    expect(isValidISOTimestamp(result.timestamp)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 3: getViolationsForAttempt returns an empty array for an unknown
  //         attempt ID — no throws.
  // -------------------------------------------------------------------------
  it("returns an empty array for an unknown attempt ID without throwing", async () => {
    // Validates: Requirements 11.3
    const violations = await getViolationsForAttempt("nonexistent_attempt_xyz");

    expect(Array.isArray(violations)).toBe(true);
    expect(violations).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 4: Violation type is preserved.
  // -------------------------------------------------------------------------
  it("preserves violation types for tab_switch, copy_attempt, and keyboard_shortcut", async () => {
    // Validates: Requirements 11.1, 11.4
    const attemptId = freshAttemptId();
    const userId = freshUserId();

    await recordViolation(userId, { attemptId, type: "tab_switch" });
    await new Promise((r) => setTimeout(r, 5));
    await recordViolation(userId, { attemptId, type: "copy_attempt" });
    await new Promise((r) => setTimeout(r, 5));
    await recordViolation(userId, { attemptId, type: "keyboard_shortcut" });

    const violations = await getViolationsForAttempt(attemptId);

    expect(violations).toHaveLength(3);

    const types = violations.map((v) => v.type);
    expect(types).toContain("tab_switch");
    expect(types).toContain("copy_attempt");
    expect(types).toContain("keyboard_shortcut");
  });

  // -------------------------------------------------------------------------
  // Test 5: Violation isolation — attempt A's violations don't bleed into
  //         attempt B's results.
  // -------------------------------------------------------------------------
  it("isolates violations per attempt — violations for attempt A do not appear in attempt B", async () => {
    // Validates: Requirements 11.1, 11.3
    const attemptIdA = freshAttemptId();
    const attemptIdB = freshAttemptId();
    const userId = freshUserId();

    // Record two violations for A, one for B.
    await recordViolation(userId, { attemptId: attemptIdA, type: "window_blur" });
    await recordViolation(userId, { attemptId: attemptIdA, type: "paste_attempt" });
    await recordViolation(userId, { attemptId: attemptIdB, type: "context_menu" });

    const violationsA = await getViolationsForAttempt(attemptIdA);
    const violationsB = await getViolationsForAttempt(attemptIdB);

    // Attempt A must have exactly 2 violations, none from B.
    expect(violationsA).toHaveLength(2);
    expect(violationsA.every((v) => v.attemptId === attemptIdA)).toBe(true);

    // Attempt B must have exactly 1 violation, none from A.
    expect(violationsB).toHaveLength(1);
    expect(violationsB[0].attemptId).toBe(attemptIdB);
    expect(violationsB[0].type).toBe("context_menu");
  });
});
