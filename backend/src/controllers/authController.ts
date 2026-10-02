import crypto from "crypto";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getUserByUsername,
  createUser,
  getUserById,
  updateLastSeen,
} from "../services/userService";
import { generateToken } from "../utils/token";

const ADMIN_USERNAME = "ADMIN001";
const ID_PATTERN = /^[A-Z0-9_.-]{3,30}$/;

/**
 * Constant-time string comparison (hashes first so lengths always match).
 */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * POST /api/auth/login
 *
 * - Admin: ADMIN001 + password (ADMIN_PASSWORD from .env). The client can
 *   NOT request the admin role; it is only granted for the admin ID + password.
 * - Student: any valid ID + full name. The account is created automatically
 *   on first login. The name is only used the first time an ID is seen.
 *   An admin can still disable an account (isAllowed = false).
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password, name } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    res.status(400).json({
      success: false,
      error: "Username is required to log in.",
    });
    return;
  }

  const normalizedUsername = username.trim().toUpperCase();

  // ---------------- Admin login ----------------
  if (normalizedUsername === ADMIN_USERNAME) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      res.status(500).json({
        success: false,
        error: "Admin login is not configured (ADMIN_PASSWORD missing).",
      });
      return;
    }

    if (typeof password !== "string" || !safeEqual(password, expected)) {
      res.status(401).json({ success: false, error: "Invalid admin credentials." });
      return;
    }

    let adminUser = await getUserByUsername(ADMIN_USERNAME);
    if (!adminUser) {
      adminUser = await createUser({
        username: ADMIN_USERNAME,
        name: "Platform Administrator",
        role: "admin",
        isAllowed: true,
      });
    }

    if (adminUser.role !== "admin") {
      res.status(403).json({ success: false, error: "This account is not an admin." });
      return;
    }

    const token = generateToken({
      id: adminUser.id,
      username: adminUser.username,
      name: adminUser.name,
      role: "admin",
      isAllowed: true,
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user: adminUser,
      data: { token, user: adminUser },
    });
    return;
  }

  // ---------------- Student login ----------------
  let user = await getUserByUsername(normalizedUsername);

  if (!user) {
    // First login with this ID: create the student automatically
    if (!ID_PATTERN.test(normalizedUsername)) {
      res.status(400).json({
        success: false,
        error: "Username must be 3-30 characters: letters, numbers, dot, dash or underscore.",
      });
      return;
    }

    const displayName = typeof name === "string" ? name.trim().slice(0, 60) : "";
    if (!displayName) {
      res.status(400).json({ success: false, error: "Please enter your full name." });
      return;
    }

    user = await createUser({
      username: normalizedUsername,
      name: displayName,
      role: "student",
      isAllowed: true,
    });
  } else if (!user.isAllowed) {
    res.status(403).json({
      success: false,
      error: "Your access has been disabled. Please contact your examiner.",
    });
    return;
  }

  // Update heartbeat
  await updateLastSeen(user.id);

  // Issue session token
  const token = generateToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    isAllowed: user.isAllowed,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user,
    data: { token, user },
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