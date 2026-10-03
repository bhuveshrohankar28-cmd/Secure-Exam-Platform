"use client";

import { useEffect, useRef } from "react";
import type { ViolationType } from "../types";
import { violationsApi } from "../lib/api/endpoints";

export interface UseViolationDetectorOptions {
  /** The ID of the current exam attempt. */
  attemptId: string;
  /** Only detect and report violations when true (i.e., exam is in_progress). */
  enabled: boolean;
  /** Called immediately when a violation is detected, before the network request. */
  onViolation?: (type: ViolationType) => void;
}

interface ViolationRecord {
  type: ViolationType;
  metadata: Record<string, unknown>;
}

const RETRY_MAX = 3;
const RETRY_INTERVAL_MS = 5_000;
const DEBOUNCE_MS = 2_000;

/**
 * useViolationDetector
 *
 * Attaches browser event listeners to detect exam-integrity violations while
 * `enabled` is true. On each detected event it:
 *   1. Calls `onViolation(type)` synchronously (to show the ViolationOverlay).
 *   2. POSTs the violation to the backend with up to 3 retries at 5-second
 *      intervals; silently discards if all retries are exhausted.
 *
 * Per-type debouncing (2 s) prevents flooding the backend with rapid repeated
 * events of the same kind.
 *
 * All listeners are cleaned up on unmount or when `enabled` becomes false.
 */
export function useViolationDetector({
  attemptId,
  enabled,
  onViolation,
}: UseViolationDetectorOptions): void {
  // Tracks the timestamp of the last detected event for each violation type to
  // implement per-type debouncing — stored in a ref so it never triggers renders.
  const lastFiredRef = useRef<Partial<Record<ViolationType, number>>>({});

  // Retry timeout handles — stored in a ref so we can clear them on unmount.
  const retryTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    // -----------------------------------------------------------------------
    // Core helper: debounce + record
    // -----------------------------------------------------------------------
    function handleViolation(type: ViolationType, metadata: Record<string, unknown> = {}) {
      const now = Date.now();
      const lastFired = lastFiredRef.current[type] ?? 0;

      if (now - lastFired < DEBOUNCE_MS) return; // debounce rapid repeats
      lastFiredRef.current[type] = now;

      // Notify the UI immediately.
      onViolation?.(type);

      // Record with retry logic.
      recordWithRetry({ type, metadata }, RETRY_MAX);
    }

    function recordWithRetry(record: ViolationRecord, retriesLeft: number) {
      violationsApi
        .record({ attemptId, type: record.type, metadata: record.metadata })
        .then(() => {
          // Successfully recorded — nothing more to do.
        })
        .catch(() => {
          if (retriesLeft <= 1) {
            // All retries exhausted — discard silently per spec.
            return;
          }
          const timer = setTimeout(() => {
            retryTimersRef.current.delete(timer);
            recordWithRetry(record, retriesLeft - 1);
          }, RETRY_INTERVAL_MS);
          retryTimersRef.current.add(timer);
        });
    }

    // -----------------------------------------------------------------------
    // Event handlers
    // -----------------------------------------------------------------------

    function onVisibilityChange() {
      if (document.hidden) {
        handleViolation("visibility_hidden", { hidden: true });
      }
    }

    function onWindowBlur() {
      handleViolation("window_blur");
    }

    function onCopy() {
      handleViolation("copy_attempt");
    }

    function onPaste() {
      handleViolation("paste_attempt");
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      handleViolation("context_menu");
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        handleViolation("fullscreen_exit");
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+C
      if (ctrl && e.key === "c") {
        handleViolation("keyboard_shortcut", { key: "Ctrl+C" });
        return;
      }
      // Ctrl/Cmd+V
      if (ctrl && e.key === "v") {
        handleViolation("keyboard_shortcut", { key: "Ctrl+V" });
        return;
      }
      // Ctrl/Cmd+Tab
      if (ctrl && e.key === "Tab") {
        handleViolation("keyboard_shortcut", { key: "Ctrl+Tab" });
        return;
      }
      // Ctrl+Shift+I (DevTools)
      if (ctrl && e.shiftKey && (e.key === "i" || e.key === "I")) {
        handleViolation("keyboard_shortcut", { key: "Ctrl+Shift+I" });
        return;
      }
      // F12 (DevTools)
      if (e.key === "F12") {
        handleViolation("keyboard_shortcut", { key: "F12" });
        return;
      }
      // Alt+Tab (window switch shortcut on Windows/Linux)
      if (e.altKey && e.key === "Tab") {
        handleViolation("keyboard_shortcut", { key: "Alt+Tab" });
        return;
      }
    }

    // -----------------------------------------------------------------------
    // Register listeners
    // -----------------------------------------------------------------------
    document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });
    window.addEventListener("blur", onWindowBlur, { passive: true });
    document.addEventListener("copy", onCopy, { passive: true });
    document.addEventListener("paste", onPaste, { passive: true });
    // contextmenu must NOT be passive because we call e.preventDefault()
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange, { passive: true });
    document.addEventListener("keydown", onKeyDown, { passive: true });

    // -----------------------------------------------------------------------
    // Cleanup: remove listeners and cancel pending retries
    // -----------------------------------------------------------------------
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("keydown", onKeyDown);

      // Cancel any pending retry timers.
      for (const timer of retryTimersRef.current) {
        clearTimeout(timer);
      }
      retryTimersRef.current.clear();

      // Reset the debounce map so a fresh enable gets a clean slate.
      lastFiredRef.current = {};
    };
  }, [attemptId, enabled, onViolation]);
}
