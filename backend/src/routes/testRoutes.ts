import { Router } from "express";
import {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  importQuestions,
} from "../controllers/testController";
import {
  verifyToken,
  requireRole,
  requireAllowedStudent,
} from "../middleware/authMiddleware";

const router = Router();

const adminOnly = [verifyToken, requireRole(["admin", "superadmin"])];

// GET /api/tests — admin: all tests, student: active tests only
router.get("/", verifyToken, requireAllowedStudent, getTests);

// GET /api/tests/:id — admin: test + questions with answers, student: summary only
router.get("/:id", verifyToken, requireAllowedStudent, getTestById);

// Admin-only write operations
router.post("/", ...adminOnly, createTest);
router.put("/:id", ...adminOnly, updateTest);
router.delete("/:id", ...adminOnly, deleteTest);

// POST /api/tests/:id/questions/import — admin pastes/uploads questions as JSON
router.post("/:id/questions/import", ...adminOnly, importQuestions);

export default router;