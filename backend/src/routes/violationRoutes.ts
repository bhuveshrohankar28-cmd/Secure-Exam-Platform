import { Router } from "express";
import { recordViolationHandler } from "../controllers/violationController";
import { verifyToken, requireAllowedStudent } from "../middleware/authMiddleware";

const router = Router();

// All violation routes require authentication + allowed-student check
router.use(verifyToken, requireAllowedStudent);

// POST /api/violations — record a browser integrity violation for an active attempt
router.post("/", recordViolationHandler);

export default router;
