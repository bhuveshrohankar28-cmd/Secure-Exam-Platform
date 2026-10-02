import { apiRequest } from "./client";
import { User } from "../../types";

/**
 * API functions for /api/auth endpoints
 * Login by username. User accounts are created on first login.
 * Admin (ADMIN001) must also send a password.
 */
export const authApi = {
  login: (username: string, password?: string, name?: string) =>
    apiRequest<{ token: string; user: User; message?: string }>("/api/auth/login", {
      method: "POST",
      body: { username, password, name },
      requiresAuth: false,
    }),
  logout: () => apiRequest("/api/auth/logout", { method: "POST" }),
  me: () => apiRequest("/api/auth/me"),
};

/**
 * API functions for /api/users endpoints
 */
export const usersApi = {
  heartbeat: () => apiRequest("/api/users/heartbeat", { method: "POST" }),
  me: () => apiRequest("/api/users/me"),
};

/**
 * API functions for /api/tests endpoints
 */
export const testsApi = {
  getAll: () => apiRequest("/api/tests"),
  getById: (id: string) => apiRequest(`/api/tests/${id}`),
};

/**
 * API functions for /api/attempts endpoints
 */
export const attemptsApi = {
  start: (testId: string) =>
    apiRequest("/api/attempts", { method: "POST", body: { testId } }),
  getById: (id: string) => apiRequest(`/api/attempts/${id}`),
  submit: (id: string) =>
    apiRequest(`/api/attempts/${id}/submit`, { method: "POST" }),
};

/**
 * API functions for /api/admin endpoints
 */
export const adminApi = {
  getUsers: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/api/admin/users${query}`);
  },
  allowUser: (userId: string, isAllowed: boolean) =>
    apiRequest(`/api/admin/users/${userId}/allow`, {
      method: "PATCH",
      body: { isAllowed },
    }),
  getTests: () => apiRequest("/api/admin/tests"),
  getAttempts: () => apiRequest("/api/admin/attempts"),
};

/**
 * Health check — no auth required
 */
export const healthApi = {
  check: () => apiRequest("/api/health", { requiresAuth: false }),
};