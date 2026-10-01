import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getUserByRtfId,
  createUser,
  getUserById,
  updateLastSeen,
} from "../services/userService";
import { generateToken } from "../utils/token";

/**
 * POST /api/auth/login
 *
 * Direct login via RTF ID.
 * - Admin can log in with ADMIN001 (or role = 'admin')
 * - Students log in with their RTF ID (e.g. RTF2024001)
 * - Enforces admin approval: if isAllowed === false, login is blocked!
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { rtfId, role } = req.body;

  if (!rtfId || typeof rtfId !== "string" || !rtfId.trim()) {
    res.status(400).json({
      success: false,
      error: "RTF ID is required to log in.",
    });
    return;
  }

  const normalizedRtf = rtfId.trim().toUpperCase();

  // Handle Admin login shortcut
  if (normalizedRtf === "ADMIN001" || role === "admin") {
    let adminUser = await getUserByRtfId("ADMIN001");
    if (!adminUser) {
      adminUser = await createUser({
        rtfId: "ADMIN001",
        name: "Platform Administrator",
        role: "admin",
        isAllowed: true,
      });
    }

    const token = generateToken({
      id: adminUser.id,
      rtfId: adminUser.rtfId,
      name: adminUser.name,
      role: "admin",
      isAllowed: true,
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user: adminUser,
      data: {
        token,
        user: adminUser,
      },
    });
    return;
  }

  // Look up student by RTF ID
  const user = await getUserByRtfId(normalizedRtf);

  if (!user) {
    res.status(404).json({
      success: false,
      error: `RTF ID "${normalizedRtf}" was not found. Please register or contact your examination administrator.`,
    });
    return;
  }

  // Check Admin Approval
  if (!user.isAllowed || user.accountStatus === "pending") {
    res.status(403).json({
      success: false,
      isPending: true,
      error: `Access Denied: Your RTF ID (${normalizedRtf}) has not been approved by an administrator yet. Please wait for an admin to allow your account.`,
      user: {
        id: user.id,
        rtfId: user.rtfId,
        name: user.name,
        accountStatus: user.accountStatus,
        isAllowed: user.isAllowed,
      },
    });
    return;
  }

  // Update heartbeat
  await updateLastSeen(user.id);

  // Issue session token
  const token = generateToken({
    id: user.id,
    rtfId: user.rtfId,
    name: user.name,
    role: user.role,
    isAllowed: user.isAllowed,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user,
    data: {
      token,
      user,
    },
  });
}

/**
 * POST /api/auth/register
 *
 * Register student with RTF ID. Account is created in "pending" status
 * until an admin allows it.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { rtfId, name, email, domain, branch, yearOfPassing } = req.body;

  if (!rtfId || !name) {
    res.status(400).json({
      success: false,
      error: "RTF ID and full student name are required.",
    });
    return;
  }

  const normalizedRtf = rtfId.trim().toUpperCase();
  const existingUser = await getUserByRtfId(normalizedRtf);

  if (existingUser) {
    res.status(409).json({
      success: false,
      error: `RTF ID "${normalizedRtf}" is already registered.`,
      isAllowed: existingUser.isAllowed,
      status: existingUser.accountStatus,
    });
    return;
  }

  const newUser = await createUser({
    rtfId: normalizedRtf,
    name,
    email,
    domain,
    branch,
    yearOfPassing,
    role: "student",
    isAllowed: false, // Must be approved by admin
  });

  res.status(201).json({
    success: true,
    message: `RTF ID ${normalizedRtf} registered successfully! Your account is now pending administrator approval.`,
    user: newUser,
  });
}

/**
 * POST /api/auth/logout
 */
export function logout(req: AuthenticatedRequest, res: Response): void {
  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
}

/**
 * GET /api/auth/me
 * Returns current authenticated user and live status
 */
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const user = await getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, error: "User record not found." });
    return;
  }

  res.status(200).json({
    success: true,
    data: user,
  });
}
