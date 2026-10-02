import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { getUserById, updateLastSeen } from "../services/userService";

/**
 * GET /api/users/me
 * Returns the authenticated user's profile.
 */
export async function getMyProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const user = await getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, error: "User record not found." });
    return;
  }

  res.status(200).json({ success: true, data: user });
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