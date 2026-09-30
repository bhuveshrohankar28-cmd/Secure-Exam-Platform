import { Router } from "express";
import {
  getTestAccess,
  grantTestAccess,
  revokeTestAccess,
} from "../controllers/testAccessController";
import { verifyToken, requireRole } from "../middleware/authMiddleware";

const router = Router();

// GET /api/test-access — students see their own access; admins see all
router.get("/", verifyToken, getTestAccess);

// POST /api/test-access — admin grants access to a student
router.post("/", verifyToken, requireRole(["admin", "superadmin"]), grantTestAccess);

// DELETE /api/test-access/:id — admin revokes access
router.delete("/:id", verifyToken, requireRole(["admin", "superadmin"]), revokeTestAccess);

export default router;
