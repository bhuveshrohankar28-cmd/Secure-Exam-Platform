import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

// Attempts controller — placeholder implementations
// Full logic coming in Phase 7 (Student Exam Interface + Exam Engine)

export function startAttempt(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 7." });
}

export function getAttemptById(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 7." });
}

export function saveAnswers(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 7." });
}

export function submitAttempt(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 7." });
}
