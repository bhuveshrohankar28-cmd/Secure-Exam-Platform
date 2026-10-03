import { Router } from "express";
import {
  startAttempt,
  getMyAttempts,
  getAttemptById,
  saveAnswers,
  submitAttempt,
} from "../controllers/attemptController";
import { verifyToken, requireAllowedStudent } from "../middleware/authMiddleware";
import { codeAttemptLimiter } from "../utils/codeLimiter";

const router = Router();

router.use(verifyToken, requireAllowedStudent);

// POST /api/attempts — start (or resume) a test with its code
router.post("/", codeAttemptLimiter, startAttempt);

// GET /api/attempts/mine — the student's own attempts and scores
// (must stay above "/:id")
router.get("/mine", getMyAttempts);

// GET /api/attempts/:id — resume session after a refresh, or the result
router.get("/:id", getAttemptById);

// POST /api/attempts/:id/answers — autosave
router.post("/:id/answers", saveAnswers);

// POST /api/attempts/:id/submit — final submission
router.post("/:id/submit", submitAttempt);

export default router;