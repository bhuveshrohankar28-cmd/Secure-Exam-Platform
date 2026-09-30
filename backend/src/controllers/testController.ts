import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

// Tests controller — placeholder implementations
// Full logic coming in Phase 5 (Test Builder)

export function getTests(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 5." });
}

export function getTestById(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 5." });
}

export function createTest(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 5." });
}

export function updateTest(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 5." });
}

export function deleteTest(req: AuthenticatedRequest, res: Response): void {
  res.status(501).json({ success: false, error: "Not implemented yet. Coming in Phase 5." });
}
