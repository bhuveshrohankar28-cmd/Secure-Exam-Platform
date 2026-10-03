import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { ViolationType } from "../types/models";
import { getAttempt } from "../services/attemptService";
import {
  recordViolation,
  getViolationsForAttempt,
} from "../services/violationService";

/** All 8 allowed violation types from the spec. */
const ALLOWED_VIOLATION_TYPES: ViolationType[] = [
  "tab_switch",
  "window_blur",
  "visibility_hidden",
  "fullscreen_exit",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "keyboard_shortcut",
];

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

/** Wraps a handler so unexpected errors return JSON instead of an HTML page. */
function safe(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("[ViolationController]", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Something went wrong. Please try again.",
        });
      }
    }
  };
}

/**
 * POST /api/violations
 *
 * Records a browser integrity violation for an active attempt.
 *
 * Auth: verifyToken + requireAllowedStudent
 *
 * Body:
 *   { attemptId: string, type: ViolationType, metadata?: Record<string, unknown> }
 *
 * Responses:
 *   201 — { success: true, data: { id, timestamp } }
 *   400 — invalid body (missing/invalid attemptId or type)
 *   403 — attempt does not belong to the requesting user
 *   409 — attempt is not in_progress
 *   413 — serialized metadata exceeds 10 KB
 */
export const recordViolationHandler = safe(async (req, res) => {
  const user = req.user!;
  const { attemptId, type, metadata } = req.body;

  // --- Body validation ---
  if (!attemptId || typeof attemptId !== "string" || attemptId.trim() === "") {
    res.status(400).json({
      success: false,
      error: "attemptId is required and must be a non-empty string.",
    });
    return;
  }

  if (!type || !ALLOWED_VIOLATION_TYPES.includes(type as ViolationType)) {
    res.status(400).json({
      success: false,
      error: `type is required and must be one of: ${ALLOWED_VIOLATION_TYPES.join(", ")}.`,
    });
    return;
  }

  if (metadata !== undefined && (typeof metadata !== "object" || Array.isArray(metadata) || metadata === null)) {
    res.status(400).json({
      success: false,
      error: "metadata must be a plain object if provided.",
    });
    return;
  }

  // --- Payload size check: total serialized metadata must be ≤ 10 KB ---
  const metadataObj = (metadata ?? {}) as Record<string, unknown>;
  if (JSON.stringify(metadataObj).length > 10_000) {
    res.status(413).json({
      success: false,
      error: "Violation metadata payload exceeds the 10 KB limit.",
    });
    return;
  }

  // --- Attempt validation ---
  const attempt = await getAttempt(attemptId.trim());

  if (!attempt || attempt.userId !== user.uid) {
    res.status(403).json({
      success: false,
      error: "You are not the owner of this attempt or it does not exist.",
    });
    return;
  }

  if (attempt.status !== "in_progress") {
    res.status(409).json({
      success: false,
      error: "Violations can only be recorded for an in_progress attempt.",
    });
    return;
  }

  // --- Persist ---
  const result = await recordViolation(user.uid, {
    attemptId: attempt.id,
    type: type as ViolationType,
    metadata: metadataObj,
  });

  res.status(201).json({ success: true, data: result });
});

/**
 * GET /api/admin/attempts/:id/violations
 *
 * Returns all violation records for a given attempt.
 *
 * Auth: verifyToken + requireRole(["admin", "superadmin"]) — applied at router level
 *
 * Response:
 *   200 — { success: true, data: Violation[] }
 */
export const getAttemptViolationsHandler = safe(async (req, res) => {
  const attemptId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const violations = await getViolationsForAttempt(attemptId);

  res.status(200).json({ success: true, data: violations });
});
