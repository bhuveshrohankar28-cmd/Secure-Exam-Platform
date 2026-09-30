import { Request, Response, NextFunction } from "express";
import { auth } from "../firebase/firebaseAdmin";

/**
 * Augment Express Request to include the authenticated user.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

/**
 * verifyToken — Middleware
 *
 * Reads the Bearer token from the Authorization header,
 * verifies it using Firebase Admin SDK, and attaches the
 * decoded user to req.user.
 *
 * If Firebase is not initialized (e.g., in development without
 * credentials), it returns a 503 instead of crashing.
 */
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!auth) {
    res.status(503).json({
      success: false,
      error: "Authentication service not available. Firebase is not initialized.",
    });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      // Role is stored as a custom claim; set by admin via backend
      role: decodedToken.role as string | undefined,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token.",
    });
  }
}

/**
 * requireRole — Middleware factory
 *
 * Returns a middleware that checks whether the authenticated user
 * has one of the allowed roles.
 *
 * Usage:
 *   router.get("/admin-only", verifyToken, requireRole(["admin", "superadmin"]), handler)
 */
export function requireRole(allowedRoles: string[]) {
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
