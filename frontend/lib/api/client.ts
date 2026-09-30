import { auth } from "@/lib/firebase/firebaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

/**
 * Standard API response shape from the backend.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * getAuthToken
 *
 * Returns the current user's Firebase ID token.
 * Returns null if no user is signed in or Firebase is not configured.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * apiRequest
 *
 * Centralized API request function. Automatically:
 * - Attaches the Firebase ID token as a Bearer token
 * - Sets Content-Type to application/json
 * - Handles errors consistently
 *
 * Usage:
 *   const result = await apiRequest<User>("/api/auth/me");
 *   const result = await apiRequest<Test>("/api/tests", { method: "POST", body: { title: "..." } });
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    requiresAuth?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, requiresAuth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: "Network error. Could not reach the backend.",
    };
  }
}
