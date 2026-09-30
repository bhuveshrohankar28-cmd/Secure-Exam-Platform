import { Router } from "express";
import {
  getAdminUsers,
  getAdminTests,
  getAdminAttempts,
} from "../controllers/adminController";
import { verifyToken, requireRole } from "../middleware/authMiddleware";

const router = Router();

// All admin routes require authentication + admin/superadmin role
router.use(verifyToken, requireRole(["admin", "superadmin"]));

// GET /api/admin/users
// Supports future query params: ?year=&domain=&branch=&status=&online=&search=
router.get("/users", getAdminUsers);

// GET /api/admin/tests
router.get("/tests", getAdminTests);

// GET /api/admin/attempts
router.get("/attempts", getAdminAttempts);

export default router;
