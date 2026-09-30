// Frontend TypeScript types — mirrors backend types/models.ts
// These describe what the API returns to the frontend.
// Never include sensitive fields (e.g. correctOptionIndex) here.

export type UserRole = "student" | "admin" | "superadmin";
export type AccountStatus = "pending" | "active" | "rejected" | "blocked";
export type TestStatus = "draft" | "scheduled" | "active" | "completed" | "archived";
export type TestAccessStatus = "allowed" | "revoked" | "completed";
export type AttemptStatus = "in_progress" | "submitted" | "graded" | "force_submitted";

export interface User {
  id: string;
  rtfId: string;
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
  isAllowed: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  totalMarks: number;
  status: TestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Question as returned to the student during an exam.
 * Does NOT include correctOptionIndex.
 */
export interface QuestionForStudent {
  id: string;
  testId: string;
  text: string;
  options: string[];
  marks: number;
  order: number;
}

export interface TestAccess {
  id: string;
  testId: string;
  userId: string;
  status: TestAccessStatus;
  grantedAt: string;
  grantedBy: string;
  revokedAt: string | null;
}

export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  gradedAt: string | null;
}

/** Health check response */
export interface HealthResponse {
  message: string;
  timestamp: string;
  environment: string;
}
