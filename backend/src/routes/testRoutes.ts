import { Router } from "express";
import {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
} from "../controllers/testController";
import { verifyToken, requireRole } from "../middleware/authMiddleware";

const router = Router();

// GET /api/tests — accessible to authenticated users
router.get("/", verifyToken, getTests);
router.get("/:id", verifyToken, getTestById);

// Write operations — admin/superadmin only
router.post("/", verifyToken, requireRole(["admin", "superadmin"]), createTest);
router.put("/:id", verifyToken, requireRole(["admin", "superadmin"]), updateTest);
router.delete("/:id", verifyToken, requireRole(["admin", "superadmin"]), deleteTest);

export default router;
