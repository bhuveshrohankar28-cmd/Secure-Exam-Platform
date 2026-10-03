import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllUsers,
  updateUserAllowed,
} from "../services/userService";

/**
 * GET /api/admin/users
 * Returns all user accounts and their access statuses.
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
        u.username.toLowerCase().includes(q) ||
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
 * Admin action to enable or disable account access.
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
      ? `Account ${updatedUser.name} (${updatedUser.username}) is enabled.`
      : `Account ${updatedUser.name} (${updatedUser.username}) is disabled.`,
    user: updatedUser,
  });
}

/**
 * GET /api/admin/tests
 */
import { listTests } from "../services/testService";

export async function getAdminTests(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tests = await listTests();
  res.status(200).json({ success: true, data: tests });
}

/**
 * GET /api/admin/attempts
 */
export function getAdminAttempts(req: AuthenticatedRequest, res: Response): void {
  res.status(200).json({ success: true, data: [] });
}

/**
 * GET /api/admin/audit-logs?userId=&testId=&attemptId=
 * At least one query parameter must be provided.
 * Returns up to 500 AuditLog entries ordered by timestamp ascending.
 */
import { getAuditLogs } from "../services/auditLogService";

export async function getAuditLogsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.query.userId as string | undefined;
  const testId = req.query.testId as string | undefined;
  const attemptId = req.query.attemptId as string | undefined;

  if (!userId && !testId && !attemptId) {
    res.status(400).json({
      success: false,
      error:
        "At least one filter parameter is required: userId, testId, or attemptId.",
    });
    return;
  }

  const logs = await getAuditLogs({ userId, testId, attemptId });
  res.status(200).json({ success: true, data: logs });
}
