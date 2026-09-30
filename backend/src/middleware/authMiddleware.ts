import { Request, Response, NextFunction } from "express";
import { verifyTokenPayload } from "../utils/token";
import { UserRole } from "../types/models";

/**
 * AuthenticatedUser attached to Express request
 */
export interface AuthenticatedUser {
  id: string;
  uid: string;
  rtfId: string;
  name: string;
  role: UserRole;
  isAllowed: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * verifyToken — Middleware
 *
 * Reads Bearer token, verifies via JWT, and attaches student/admin to req.user.
 * Replaces Firebase Auth verifyIdToken.
 */
export function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  const token = authHeader.split("Bearer ")[1];
  const payload = verifyTokenPayload(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired session token. Please log in with your RTF ID again.",
    });
    return;
  }

  req.user = {
    id: payload.id,
    uid: payload.id,
    rtfId: payload.rtfId,
    name: payload.name,
    role: payload.role,
    isAllowed: payload.isAllowed,
  };

  next();
}

/**
 * requireRole — Middleware factory
 * Restricts access to specific roles (e.g. ['admin', 'superadmin']).
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * requireAllowedStudent — Middleware
 * Enforces that a student must have been approved (isAllowed = true) by an administrator.
 */
export function requireAllowedStudent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role === "admin" || req.user?.role === "superadmin") {
    next();
    return;
  }

  if (!req.user?.isAllowed) {
    res.status(403).json({
      success: false,
      error: "Your RTF ID has not been approved by an administrator yet.",
    });
    return;
  }

  next();
}
