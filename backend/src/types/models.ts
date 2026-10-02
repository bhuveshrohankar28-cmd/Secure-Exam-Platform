// ============================================================
// Firestore Data Model — TypeScript Interfaces
// ============================================================
// These interfaces describe the shape of documents stored in
// Firestore. They serve as the single source of truth for all
// team members working on different modules.
// ============================================================

// ------------------------------------------------------------------
// Shared primitives
// ------------------------------------------------------------------

/** ISO 8601 timestamp string, e.g. "2026-10-01T00:00:00.000Z" */
export type ISOTimestamp = string;

// ------------------------------------------------------------------
// User
// ------------------------------------------------------------------

export type UserRole = "student" | "admin" | "superadmin";
export type AccountStatus = "pending" | "active" | "rejected" | "blocked";

/**
 * users/{userId}
 *
 * Created when a student/admin registers.
 * Sensitive writes must go through the backend.
 */
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  collegeEnrollmentNo?: string;
  collegeEmail?: string;
  branch?: string;
  domain?: string;
  yearOfPassing?: number;
  phone?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isAllowed: boolean; // Admins may disable account access
  /**
   * Updated by the heartbeat endpoint.
   * Used to determine online/offline status.
   */
  lastSeen: ISOTimestamp | null;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ------------------------------------------------------------------
// Test
// ------------------------------------------------------------------

export type TestStatus = "draft" | "scheduled" | "active" | "completed" | "archived";

/**
 * tests/{testId}
 *
 * Defines an MCQ examination.
 */
export interface Test {
  id: string;
  title: string;
  description: string;
  /** Duration in minutes */
  duration: number;
  totalMarks: number;
  questionCount: number;
  status: TestStatus;
  createdBy: string; // userId of admin who created the test
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ------------------------------------------------------------------
// Question
// ------------------------------------------------------------------

/**
 * questions/{questionId}
 *
 * Individual MCQ question belonging to a test.
 */
export interface Question {
  id: string;
  testId: string;
  text: string;
  options: string[]; // 4 options, index 0–3
  /** Index of the correct option (0–3). Never exposed to the student during the exam. */
  correctOptionIndex: number;
  marks: number;
  order: number; // display order within the test
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ------------------------------------------------------------------
// Test Access
// ------------------------------------------------------------------

export type TestAccessStatus = "allowed" | "revoked" | "completed";

/**
 * testAccess/{accessId}
 *
 * Represents an admin granting a student permission to take a test.
 * A student can see a test ONLY if a "allowed" access record exists.
 */
export interface TestAccess {
  id: string;
  testId: string;
  userId: string;
  status: TestAccessStatus;
  grantedAt: ISOTimestamp;
  grantedBy: string; // userId of admin
  revokedAt: ISOTimestamp | null;
}

// ------------------------------------------------------------------
// Test Attempt
// ------------------------------------------------------------------

export type AttemptStatus = "in_progress" | "submitted" | "graded" | "force_submitted";

/**
 * testAttempts/{attemptId}
 *
 * Created when a student starts a test.
 */
export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: ISOTimestamp;
  submittedAt: ISOTimestamp | null;
  score: number | null; // null until graded
  gradedAt: ISOTimestamp | null;
}

// ------------------------------------------------------------------
// Answer
// ------------------------------------------------------------------

/**
 * answers/{answerId}
 *
 * An individual answer submitted by a student for a question.
 */
export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  userId: string;
  selectedOptionIndex: number | null; // null if skipped
  answeredAt: ISOTimestamp;
}

// ------------------------------------------------------------------
// Violation
// ------------------------------------------------------------------

export type ViolationType =
  | "tab_switch"
  | "window_blur"
  | "visibility_hidden"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu"
  | "keyboard_shortcut"
  | "other";

/**
 * violations/{violationId}
 *
 * Recorded when a student triggers a browser-based integrity violation.
 * Note: Browser-based monitoring cannot prevent screenshots, screen
 * recording, or external-device cheating. This provides integrity
 * monitoring and violation detection only.
 */
export interface Violation {
  id: string;
  attemptId: string;
  userId: string;
  type: ViolationType;
  timestamp: ISOTimestamp;
  metadata: Record<string, unknown>; // extra context (e.g. key pressed)
}

// ------------------------------------------------------------------
// Audit Log
// ------------------------------------------------------------------

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_REGISTERED"
  | "USER_STATUS_CHANGED"
  | "TEST_CREATED"
  | "TEST_UPDATED"
  | "TEST_DELETED"
  | "TEST_ACCESS_GRANTED"
  | "TEST_ACCESS_REVOKED"
  | "EXAM_STARTED"
  | "EXAM_SUBMITTED"
  | "EXAM_FORCE_SUBMITTED"
  | "VIOLATION_DETECTED"
  | "ANSWER_SAVED";

export type AuditEntityType =
  | "user"
  | "test"
  | "testAccess"
  | "attempt"
  | "violation";

/**
 * auditLogs/{logId}
 *
 * Immutable record of important system actions.
 * Used for admin review, debugging, and compliance.
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  timestamp: ISOTimestamp;
  metadata: Record<string, unknown>;
}
