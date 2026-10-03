"use client";

import { useEffect, useRef, useState } from "react";
import { formatTimeHHMMSS, timerColorState } from "@/lib/utils/time";

export interface UseExamTimerOptions {
  /** Server-authoritative remaining milliseconds on first load. */
  initialRemainingMs: number;
  /** Called exactly once when the timer reaches 0. */
  onExpire?: () => void;
}

export interface UseExamTimerReturn {
  remainingMs: number;
  /** HH:MM:SS formatted remaining time. */
  formattedTime: string;
  colorState: "default" | "warning" | "critical";
  isExpired: boolean;
}

/**
 * useExamTimer
 *
 * Starts a countdown from `initialRemainingMs` using an anchor pattern that
 * prevents cumulative drift. On each tick the displayed value is:
 *
 *   max(0, deadlineRef.current - Date.now())
 *
 * so accumulated error is bounded to ~1 ms per tick rather than adding up.
 *
 * Calls `onExpire` exactly once when the timer first reaches zero.
 * Cleans up the interval on unmount.
 */
export function useExamTimer({
  initialRemainingMs,
  onExpire,
}: UseExamTimerOptions): UseExamTimerReturn {
  // Server-authoritative absolute deadline (set once on mount).
  const deadlineRef = useRef<number>(Date.now() + Math.max(0, initialRemainingMs));

  // Guard: ensure onExpire fires at most once even if the interval fires twice
  // in the same tick around zero.
  const expiredCalledRef = useRef<boolean>(false);

  const [remainingMs, setRemainingMs] = useState<number>(
    Math.max(0, initialRemainingMs)
  );

  useEffect(() => {
    // Reset the deadline anchor using the initial value captured at mount.
    // This is intentionally set inside the effect so it runs once per mount,
    // which is the correct place for side-effectful time anchoring.
    deadlineRef.current = Date.now() + Math.max(0, initialRemainingMs);
    expiredCalledRef.current = false;

    // If initialRemainingMs is already 0 or negative, fire onExpire immediately.
    if (initialRemainingMs <= 0) {
      setRemainingMs(0);
      if (!expiredCalledRef.current) {
        expiredCalledRef.current = true;
        onExpire?.();
      }
      return;
    }

    const id = setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(remaining);

      if (remaining === 0 && !expiredCalledRef.current) {
        expiredCalledRef.current = true;
        onExpire?.();
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount; onExpire intentionally excluded to avoid resets on re-render.

  return {
    remainingMs,
    formattedTime: formatTimeHHMMSS(remainingMs),
    colorState: timerColorState(remainingMs),
    isExpired: remainingMs === 0,
  };
}
