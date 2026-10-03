import { Router } from "express";
import {
  getAdminUsers,
  getAdminTests,
  toggleUserApproval,
  getAuditLogsHandler,
} from "../controllers/adminController";
import { listAllAttempts, resetAttempt, forceSubmitAttempt } from "../controllers/attemptController";
import { getAttemptViolationsHandler } from "../controllers/violationController";
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

// POST /api/admin/attempts/:id/force-submit — grade and close an in-progress attempt
router.post("/attempts/:id/force-submit", forceSubmitAttempt);

// GET /api/admin/attempts/:id/violations — list all violations for an attempt
router.get("/attempts/:id/violations", getAttemptViolationsHandler);

// GET /api/admin/audit-logs?userId=&testId=&attemptId=
router.get("/audit-logs", getAuditLogsHandler);

export default router;