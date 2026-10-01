/**
 * Centralized API Client for Frontend
 *
 * NOTE: No .env file is needed for the frontend.
 * In development, requests connect directly to http://localhost:5000
 * or via Next.js internal rewrite proxy.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * In browser runtime, an empty API_BASE leverages the Next.js rewrite proxy
 * (configured in next.config.ts), allowing physical mobile devices on the same Wi-Fi
 * (e.g. http://192.168.1.15:3000) to communicate seamlessly without localhost resolution errors.
 * In SSR / Node runtime, it defaults to direct backend address.
 */
const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Retrieves the stored auth token from localStorage (set upon login).
 * Completely eliminates any need for client-side Firebase keys or .env variables.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

/**
 * Centralized HTTP request helper.
 * - Automatically attaches Authorization Bearer token from localStorage
 * - Sets standard application/json headers
 * - Handles JSON serialization and error fallbacks
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    requiresAuth?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, requiresAuth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = getAuthToken();
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

    const rawData = (await response.json()) as Record<string, unknown>;
    const normalized: ApiResponse<T> = {
      success: Boolean(rawData.success),
      data: (rawData.data !== undefined ? rawData.data : rawData) as T,
      error: typeof rawData.error === "string" ? rawData.error : undefined,
      ...rawData,
    };
    return normalized;
  } catch {
    return {
      success: false,
      error: "Network error. Could not reach backend server at http://localhost:5000.",
    };
  }
}
