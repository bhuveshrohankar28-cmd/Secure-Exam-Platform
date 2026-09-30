import { apiRequest } from "./client";

/**
 * API functions for /api/auth endpoints
 * Direct RTF ID Login & Registration (No Firebase Auth)
 */
export const authApi = {
  login: (rtfId: string, role?: string) =>
    apiRequest<{ token: string; user: any; message?: string }>("/api/auth/login", {
      method: "POST",
      body: { rtfId, role },
      requiresAuth: false,
    }),
  register: (data: {
    rtfId: string;
    name: string;
    email?: string;
    domain?: string;
    branch?: string;
    yearOfPassing?: number;
  }) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: data,
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
  preAllowRtfId: (rtfId: string, name?: string) =>
    apiRequest("/api/admin/users/pre-allow", {
      method: "POST",
      body: { rtfId, name },
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
