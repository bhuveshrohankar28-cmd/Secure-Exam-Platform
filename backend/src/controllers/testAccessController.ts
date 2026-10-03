import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { getTestById } from "../services/testService";
import { getUserById } from "../services/userService";
import {
  grantTestAccess as createGrant,
  listTestAccess,
  revokeTestAccess as createRevoke,
} from "../services/testAccessService";

function paramId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function getTestAccess(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const isAdmin = req.user?.role === "admin" || req.user?.role === "superadmin";
  const testId = typeof req.query.testId === "string" ? req.query.testId : undefined;
  const userId = isAdmin ? undefined : req.user!.id;
  const records = await listTestAccess({ testId, userId });
  res.status(200).json({ success: true, data: records });
}

export async function grantTestAccess(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const testId = typeof req.body?.testId === "string" ? req.body.testId.trim() : "";
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  if (!testId || !userId) {
    res.status(400).json({ success: false, error: "A test and student are required." });
    return;
  }

  const [test, user] = await Promise.all([getTestById(testId), getUserById(userId)]);
  if (!test) {
    res.status(404).json({ success: false, error: "Test not found." });
    return;
  }
  if (!user || user.role !== "student") {
    res.status(404).json({ success: false, error: "Student not found." });
    return;
  }

  const access = await createGrant(testId, userId, req.user!.id);
  res.status(200).json({ success: true, data: access });
}

export async function revokeTestAccess(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const access = await createRevoke(paramId(req.params.id));
  if (!access) {
    res.status(404).json({ success: false, error: "Test access record not found." });
    return;
  }
  res.status(200).json({ success: true, data: access });
}
