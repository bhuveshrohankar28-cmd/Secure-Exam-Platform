import { Router } from "express";
import {
  startAttempt,
  getAttemptById,
  saveAnswers,
  submitAttempt,
} from "../controllers/attemptController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.use(verifyToken);

// POST /api/attempts — start an attempt
router.post("/", startAttempt);

// GET /api/attempts/:id — get attempt details
router.get("/:id", getAttemptById);

// POST /api/attempts/:id/answers — autosave answers
router.post("/:id/answers", saveAnswers);

// POST /api/attempts/:id/submit — final submission
router.post("/:id/submit", submitAttempt);

export default router;
