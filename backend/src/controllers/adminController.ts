import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

// Admin controller — placeholder implementations
// Full logic coming in Phase 4 (Admin Dashboard)

/**
 * GET /api/admin/users
 *
 * Returns a list of registered users.
 * Will support filtering by: year, domain, branch, status, online/offline.
 * Full implementation in Phase 4.
 */
export function getAdminUsers(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 4." });
}

/**
 * GET /api/admin/tests
 * Full implementation in Phase 5.
 */
export function getAdminTests(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 5." });
}

/**
 * GET /api/admin/attempts
 * Full implementation in Phase 9.
 */
export function getAdminAttempts(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 9." });
}
