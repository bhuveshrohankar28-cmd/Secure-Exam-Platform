import rateLimit from "express-rate-limit";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

/**
 * Stops students from guessing test codes.
 *
 * - Only FAILED requests (status >= 400) count, so the lobby can poll every
 *   few seconds without ever hitting the limit.
 * - Counted per logged-in user, not per IP, because a whole hall of phones
 *   shares one IP. Must run AFTER verifyToken.
 */
export const codeAttemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthenticatedRequest).user?.id ?? "anonymous",
  message: { success: false, error: "Too many wrong codes. Please wait a minute and try again." },
});