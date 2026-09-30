import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

/**
 * POST /api/auth/register
 * Placeholder — full implementation in Phase 2
 */
export function register(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 2." });
}

/**
 * POST /api/auth/login
 * Placeholder — full implementation in Phase 2
 */
export function login(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 2." });
}

/**
 * POST /api/auth/logout
 * Placeholder — full implementation in Phase 2
 */
export function logout(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 2." });
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's basic info from the verified token.
 */
export function getMe(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }
  res.status(200).json({ success: true, data: req.user });
}
