import { Router } from "express";
import {
  getAdminUsers,
  getAdminTests,
  getAdminAttempts,
  toggleUserApproval,
} from "../controllers/adminController";
import { verifyToken, requireRole } from "../middleware/authMiddleware";

const router = Router();

// All admin routes require authentication + admin/superadmin role
router.use(verifyToken, requireRole(["admin", "superadmin"]));

// GET /api/admin/users
router.get("/users", getAdminUsers);

// PATCH /api/admin/users/:userId/allow
// Admin allows or revokes a student's examination access
router.patch("/users/:userId/allow", toggleUserApproval);

// GET /api/admin/tests
router.get("/tests", getAdminTests);

// GET /api/admin/attempts
router.get("/attempts", getAdminAttempts);

export default router;
