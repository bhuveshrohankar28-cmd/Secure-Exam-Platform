import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { updateLastSeen } from "../services/userService";

/**
 * GET /api/users/me
 * Returns the authenticated user's profile from Firestore.
 * Placeholder — full implementation in Phase 3.
 */
export function getMyProfile(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 3." });
}

/**
 * POST /api/users/heartbeat
 *
 * Updates the lastSeen timestamp for the authenticated user.
 * Called periodically from the student dashboard to indicate
 * that the student is currently online.
 *
 * Admin uses lastSeen to determine online/offline status:
 *   ONLINE  → Date.now() - lastSeen < threshold (e.g. 60 seconds)
 *   OFFLINE → otherwise
 */
export async function heartbeat(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  try {
    await updateLastSeen(req.user.uid);
    res.status(200).json({ success: true, data: { message: "Heartbeat recorded." } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update heartbeat." });
  }
}
