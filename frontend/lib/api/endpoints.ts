import { AttemptStatus, QuestionInput, Test, TestAccess, User } from "../../types";
import { apiRequest } from "./client";

export interface AttemptView {
  id: string;
  testTitle: string;
  status: AttemptStatus;
  startedAt: string;
  endsAt: string;
  submittedAt: string | null;
  score: number | null;
  totalMarks: number | null;
  correctCount: number | null;
  answeredCount: number | null;
  testId?: string;
  userName?: string;
}

export interface LobbyResponse {
  test: Pick<Test, "title" | "description" | "duration" | "totalMarks" | "questionCount" | "status">;
  state: "waiting" | "ready" | "in_progress" | "finished" | "ended";
  attempt: AttemptView | null;
}

export interface ExamSession {
  resumed: boolean;
  attempt: AttemptView;
  test: { title: string; duration: number; totalMarks: number };
  questions: Array<{
    id: string;
    text: string;
    options: string[];
    marks: number;
    order: number;
  }>;
  answers: Record<string, number | null>;
  remainingMs: number;
  serverTime: string;
}

export interface TestDetails extends Test {
  questions: Array<QuestionInput & { id: string; order: number }>;
}

export const authApi = {
  login: (username: string, password?: string, name?: string) =>
    apiRequest<{ token: string; user: User; message?: string }>("/api/auth/login", {
      method: "POST",
      body: { username, password, name },
      requiresAuth: false,
    }),
  logout: () => apiRequest("/api/auth/logout", { method: "POST" }),
  me: () => apiRequest<User>("/api/auth/me"),
};

export const usersApi = {
  heartbeat: () => apiRequest("/api/users/heartbeat", { method: "POST" }),
  me: () => apiRequest<User>("/api/users/me"),
};

export const testsApi = {
  getAll: (status?: string) =>
    apiRequest<Test[]>(`/api/tests${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getById: (id: string) => apiRequest<TestDetails>(`/api/tests/${id}`),
  getLobby: (code: string) =>
    apiRequest<LobbyResponse>(`/api/tests/code/${encodeURIComponent(code)}`),
  create: (input: Pick<Test, "title" | "description" | "duration">) =>
    apiRequest<Test>("/api/tests", { method: "POST", body: input }),
  update: (
    id: string,
    patch: Partial<Pick<Test, "title" | "description" | "duration" | "status">>
  ) => apiRequest<Test>(`/api/tests/${id}`, { method: "PUT", body: patch }),
  delete: (id: string) => apiRequest(`/api/tests/${id}`, { method: "DELETE" }),
  importQuestions: (
    id: string,
    questions: QuestionInput[],
    mode: "append" | "replace" = "append"
  ) =>
    apiRequest<{
      testId: string;
      testCode: string;
      added: number;
      replaced: number;
      questionCount: number;
      totalMarks: number;
    }>(`/api/tests/${id}/questions/import`, {
      method: "POST",
      body: { mode, questions },
    }),
  regenerateCode: (id: string) =>
    apiRequest<{ testCode: string }>(`/api/tests/${id}/regenerate-code`, { method: "POST" }),
};

export const attemptsApi = {
  start: (code: string) =>
    apiRequest<ExamSession>("/api/attempts", { method: "POST", body: { code } }),
  mine: () => apiRequest<AttemptView[]>("/api/attempts/mine"),
  getById: (id: string) =>
    apiRequest<ExamSession | { attempt: AttemptView }>(`/api/attempts/${id}`),
  saveAnswers: (
    id: string,
    answers: Array<{ questionId: string; selectedOptionIndex: number | null }>
  ) =>
    apiRequest<{ saved: number; remainingMs: number; serverTime: string }>(
      `/api/attempts/${id}/answers`,
      { method: "POST", body: { answers } }
    ),
  submit: (
    id: string,
    answers?: Array<{ questionId: string; selectedOptionIndex: number | null }>
  ) =>
    apiRequest<{ attempt: AttemptView; alreadySubmitted?: boolean }>(
      `/api/attempts/${id}/submit`,
      { method: "POST", body: answers ? { answers } : {} }
    ),
};

export const adminApi = {
  getUsers: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiRequest<User[]>(`/api/admin/users${query}`);
  },
  allowUser: (userId: string, isAllowed: boolean) =>
    apiRequest(`/api/admin/users/${userId}/allow`, {
      method: "PATCH",
      body: { isAllowed },
    }),
  getTests: () => apiRequest<Test[]>("/api/admin/tests"),
  getAttempts: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiRequest<AttemptView[]>(`/api/admin/attempts${query}`);
  },
  resetAttempt: (attemptId: string) =>
    apiRequest(`/api/admin/attempts/${attemptId}/reset`, { method: "POST" }),
};

export const testAccessApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiRequest<TestAccess[]>(`/api/test-access${query}`);
  },
  grant: (testId: string, userId: string) =>
    apiRequest<TestAccess>("/api/test-access", { method: "POST", body: { testId, userId } }),
  revoke: (accessId: string) =>
    apiRequest<TestAccess>(`/api/test-access/${accessId}`, { method: "DELETE" }),
};

export const healthApi = {
  check: () => apiRequest("/api/health", { requiresAuth: false }),
};
