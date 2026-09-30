import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllUsers,
  updateUserAllowed,
  getUserByRtfId,
  createUser,
} from "../services/userService";

/**
 * GET /api/admin/users
 * Returns list of students and admins with their RTF IDs and approval statuses.
 */
export async function getAdminUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const users = await getAllUsers();
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;

  let filtered = users;

  if (status) {
    filtered = filtered.filter((u) => u.accountStatus === status);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.rtfId.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.domain && u.domain.toLowerCase().includes(q))
    );
  }

  res.status(200).json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
}

/**
 * PATCH /api/admin/users/:userId/allow
 * Admin action to allow or revoke student access by RTF ID/User ID
 */
export async function toggleUserApproval(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { userId } = req.params;
  const { isAllowed } = req.body;

  const targetId = Array.isArray(userId) ? userId[0] : userId;
  const shouldAllow = isAllowed !== undefined ? Boolean(isAllowed) : true;
  const updatedUser = await updateUserAllowed(targetId, shouldAllow);

  if (!updatedUser) {
    res.status(404).json({
      success: false,
      error: `User with ID ${userId} not found.`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: shouldAllow
      ? `Student ${updatedUser.name} (${updatedUser.rtfId}) is now ALLOWED to take exams.`
      : `Student ${updatedUser.name} (${updatedUser.rtfId}) access has been REVOKED.`,
    user: updatedUser,
  });
}

/**
 * POST /api/admin/users/pre-allow
 * Allows admin to pre-approve an RTF ID before the student even logs in.
 */
export async function preAllowRtfId(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { rtfId, name, domain, branch, yearOfPassing } = req.body;

  if (!rtfId) {
    res.status(400).json({ success: false, error: "RTF ID is required." });
    return;
  }

  const normalizedRtf = rtfId.trim().toUpperCase();
  const existing = await getUserByRtfId(normalizedRtf);

  if (existing) {
    const updated = await updateUserAllowed(existing.id, true);
    res.status(200).json({
      success: true,
      message: `RTF ID ${normalizedRtf} is now approved!`,
      user: updated,
    });
    return;
  }

  const newUser = await createUser({
    rtfId: normalizedRtf,
    name: name || `Student ${normalizedRtf}`,
    domain,
    branch,
    yearOfPassing,
    isAllowed: true, // Pre-approved!
  });

  res.status(201).json({
    success: true,
    message: `RTF ID ${normalizedRtf} pre-approved successfully!`,
    user: newUser,
  });
}

/**
 * GET /api/admin/tests
 */
export function getAdminTests(req: AuthenticatedRequest, res: Response): void {
  res.status(200).json({ success: true, data: [] });
}

/**
 * GET /api/admin/attempts
 */
export function getAdminAttempts(req: AuthenticatedRequest, res: Response): void {
  res.status(200).json({ success: true, data: [] });
}
