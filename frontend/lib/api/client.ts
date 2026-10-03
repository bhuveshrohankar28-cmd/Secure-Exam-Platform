/**
 * Centralized API client. Browser requests use the Next.js API rewrite;
 * server-side requests use NEXT_PUBLIC_API_URL or the local backend.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
}

const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem("auth_token", token);
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem("auth_token");
}

export async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    requiresAuth?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, requiresAuth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = requiresAuth ? getAuthToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const rawData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const result: ApiResponse<T> = {
      success: response.ok && rawData.success !== false,
      data: (rawData.data !== undefined ? rawData.data : rawData) as T,
      error: typeof rawData.error === "string" ? rawData.error : undefined,
      details: Array.isArray(rawData.details)
        ? rawData.details.filter((detail): detail is string => typeof detail === "string")
        : undefined,
    };
    if (!response.ok && !result.error) result.error = `Request failed (${response.status}).`;
    return result;
  } catch (error) {
    console.error(`[API] ${method} ${path} failed:`, error);
    return {
      success: false,
      error: `Could not reach the backend at ${API_BASE || "the frontend API proxy"}.`,
    };
  }
}
