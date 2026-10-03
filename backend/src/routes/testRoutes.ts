import { Router } from "express";
import {
  getTests,
  getTestById,
  getLobbyByCode,
  createTest,
  updateTest,
  deleteTest,
  importQuestions,
  regenerateCode,
} from "../controllers/testController";
import {
  verifyToken,
  requireRole,
  requireAllowedStudent,
} from "../middleware/authMiddleware";
import { codeAttemptLimiter } from "../utils/codeLimiter";

const router = Router();

const adminOnly = [verifyToken, requireRole(["admin", "superadmin"])];

// GET /api/tests/code/:code — the lobby. Students enter a code, not a test ID.
// (must stay above "/:id" so "code" is not treated as an ID)
router.get(
  "/code/:code",
  verifyToken,
  requireAllowedStudent,
  codeAttemptLimiter,
  getLobbyByCode
);

// Admin-only
router.get("/", verifyToken, requireAllowedStudent, getTests);
router.get("/:id", ...adminOnly, getTestById);
router.post("/", ...adminOnly, createTest);
router.put("/:id", ...adminOnly, updateTest);
router.delete("/:id", ...adminOnly, deleteTest);
router.post("/:id/questions/import", ...adminOnly, importQuestions);
router.post("/:id/regenerate-code", ...adminOnly, regenerateCode);

export default router;