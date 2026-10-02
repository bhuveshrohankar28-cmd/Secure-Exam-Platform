import jwt from "jsonwebtoken";
import { UserRole } from "../types/models";

const JWT_EXPIRES_IN = "24h";

export interface TokenPayload {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isAllowed: boolean;
}

/**
 * Reads the secret lazily (after dotenv has loaded).
 * In production a missing JWT_SECRET is a hard error.
 */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }

  console.warn("[Auth] JWT_SECRET not set — using an insecure dev-only secret.");
  return "dev-only-insecure-secret";
}

/**
 * Signs a JWT session token for an authenticated student or admin.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Decodes and verifies a JWT token. Returns null if invalid or expired.
 */
export function verifyTokenPayload(token: string): TokenPayload | null {
  const secret = getSecret();
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}