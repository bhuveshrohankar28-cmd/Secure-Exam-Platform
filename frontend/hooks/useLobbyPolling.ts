"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LobbyResponse, testsApi } from "../lib/api/endpoints";

/** States where polling should stop. */
const TERMINAL_STATES = new Set<LobbyResponse["state"]>(["in_progress", "ended"]);

/** Milliseconds to wait after each response before the next poll. */
const POLL_INTERVAL_MS = 10_000;

/** If a single poll takes longer than this, the connection is considered degraded. */
const DEGRADED_THRESHOLD_MS = 15_000;

export interface UseLobbyPollingOptions {
  /** Test code to poll. */
  code: string;
  /** Enables or disables polling. Polling starts when this becomes true, stops when false. */
  enabled: boolean;
  /** Called once when the lobby state transitions to "in_progress". */
  onNavigate?: (attemptId: string) => void;
}

export interface UseLobbyPollingReturn {
  lobbyState: LobbyResponse | null;
  error: string | null;
  isLoading: boolean;
  /** True when the last poll took > 15 s or timed out. */
  isDegraded: boolean;
}

/**
 * useLobbyPolling
 *
 * Polls `testsApi.getLobby(code)` immediately on mount (when enabled), then
 * schedules the next poll 10 seconds after each response completes.
 *
 * Polling stops automatically when the lobby transitions to "in_progress" or
 * "ended". When "in_progress" is detected, `onNavigate` is called with the
 * attempt id.
 *
 * `isDegraded` is set to true when any individual poll takes more than 15 s
 * and is cleared once a healthy response arrives within the threshold.
 */
export function useLobbyPolling({
  code,
  enabled,
  onNavigate,
}: UseLobbyPollingOptions): UseLobbyPollingReturn {
  const [lobbyState, setLobbyState] = useState<LobbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDegraded, setIsDegraded] = useState<boolean>(false);

  // Ref to the scheduled next-poll timeout. Using a ref (not state) avoids
  // triggering re-renders when the timeout is rescheduled.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard against setting state after unmount.
  const isMountedRef = useRef<boolean>(true);

  // Keep a stable reference to onNavigate so the poll loop can call the latest
  // version without re-scheduling the effect.
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  });

  const clearScheduledPoll = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !code) {
      clearScheduledPoll();
      return;
    }

    let stopped = false;

    const poll = async () => {
      if (stopped || !isMountedRef.current) return;

      setIsLoading(true);
      const startTime = Date.now();

      try {
        const response = await testsApi.getLobby(code);
        const elapsed = Date.now() - startTime;

        if (!isMountedRef.current || stopped) return;

        setIsLoading(false);

        if (!response.success || !response.data) {
          // Treat a non-success response as a degraded poll, keep retrying.
          setIsDegraded(true);
          setError(response.error ?? "Unexpected response from server");
          if (!stopped && isMountedRef.current) {
            timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
          return;
        }

        const data = response.data;
        setError(null);
        setIsDegraded(elapsed > DEGRADED_THRESHOLD_MS);
        setLobbyState(data);

        // Handle terminal state transitions before scheduling the next poll.
        if (data.state === "in_progress") {
          stopped = true;
          if (data.attempt?.id) {
            onNavigateRef.current?.(data.attempt.id);
          }
          return;
        }

        if (data.state === "ended") {
          stopped = true;
          return;
        }

        // Non-terminal state — schedule the next poll after 10 s from now
        // (i.e. 10 s after response completion, not wall-clock).
        if (!stopped && isMountedRef.current) {
          timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!isMountedRef.current || stopped) return;

        setIsLoading(false);
        setIsDegraded(true);
        setError(err instanceof Error ? err.message : "Poll failed");

        // Continue polling even on error (degraded mode).
        if (!stopped && isMountedRef.current) {
          timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    // Immediate first poll on mount / when enabled flips to true.
    poll();

    return () => {
      stopped = true;
      clearScheduledPoll();
    };
    // `clearScheduledPoll` is stable; re-run when code or enabled changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, enabled]);

  return { lobbyState, error, isLoading, isDegraded };
}
