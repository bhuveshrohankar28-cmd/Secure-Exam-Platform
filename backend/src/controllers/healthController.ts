import { Request, Response } from "express";

/**
 * GET /api/health
 * Public endpoint. Returns server status.
 */
export function healthCheck(req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    message: "Secure Exam Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  });
}
