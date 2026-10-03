import { Router } from "express";
import {
  getAdminUsers,
  getAdminTests,
  toggleUserApproval,
} from "../controllers/adminController";
import { listAllAttempts, resetAttempt } from "../controllers/attemptController";
import { verifyToken, requireRole } from "../middleware/authMiddleware";

const router = Router();

// All admin routes require authentication + admin/superadmin role
router.use(verifyToken, requireRole(["admin", "superadmin"]));

// GET /api/admin/users
router.get("/users", getAdminUsers);

// PATCH /api/admin/users/:userId/allow — block or unblock a student ID
router.patch("/users/:userId/allow", toggleUserApproval);


// GET /api/admin/tests
router.get("/tests", getAdminTests);

// GET /api/admin/attempts?testId=&status=
router.get("/attempts", listAllAttempts);

// POST /api/admin/attempts/:id/reset — let a student retake
router.post("/attempts/:id/reset", resetAttempt);

export default router;