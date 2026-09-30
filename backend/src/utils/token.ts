import jwt from "jsonwebtoken";
import { UserRole } from "../types/models";

const JWT_SECRET = process.env.JWT_SECRET || "secure-exam-rtf-secret-key-2026";
const JWT_EXPIRES_IN = "24h";

export interface TokenPayload {
  id: string;
  rtfId: string;
  name: string;
  role: UserRole;
  isAllowed: boolean;
}

/**
 * Signs a JWT session token for an authenticated student or admin.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Decodes and verifies a JWT token. Returns null if invalid or expired.
 */
export function verifyTokenPayload(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
