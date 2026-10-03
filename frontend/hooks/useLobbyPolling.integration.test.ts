/**
 * Integration tests for useLobbyPolling — the full lobby polling state machine.
 *
 * These tests verify the hook's behaviour end-to-end by mocking the network
 * layer (`testsApi.getLobby`) and controlling time with fake timers to drive
 * the full sequence: waiting → ready → in_progress → onNavigate.
 *
 * **Validates: Requirements 3.1–3.6**
 */

import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Module mock ───────────────────────────────────────────────────────────────
// vi.mock() is hoisted by Vitest — import the mocked module AFTER this call.
vi.mock("../lib/api/endpoints", () => ({
  testsApi: {
    getLobby: vi.fn(),
  },
}));

import { useLobbyPolling } from "./useLobbyPolling";
import { testsApi } from "../lib/api/endpoints";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal test metadata returned by the mock. */
const TEST_META = {
  title: "Integration Test Exam",
  description: "A test exam for integration tests",
  duration: 60,
  totalMarks: 100,
  questionCount: 10,
  status: "active" as const,
};

/** Attempt object returned once the state reaches in_progress. */
const ATTEMPT = {
  id: "att_123",
  testTitle: "Integration Test Exam",
  status: "in_progress" as const,
  startedAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 3_600_000).toISOString(),
  submittedAt: null,
  score: null,
  totalMarks: 100,
  correctCount: null,
  answeredCount: 0,
};

/** Wrap a value in a resolved success envelope (real Promise). */
function apiOk<T>(data: T) {
  return Promise.resolve({ success: true as const, data });
}

/** Wrap an error string in a resolved error envelope (real Promise). */
function apiErr(error: string) {
  return Promise.resolve({ success: false as const, error, data: undefined });
}

/**
 * Advance the fake clock by `ms` and then run all enqueued microtasks so that
 * resolved Promises (API mocks) settle before the next assertion.
 *
 * We advance in 1ms steps up to the target to give intermediate microtask
 * queues a chance to drain between setTimeout callbacks.
 */
async function tick(ms = 0) {
  return act(async () => {
    // vi.advanceTimersByTime fires any setTimeouts that are now due.
    vi.advanceTimersByTime(ms);
    // Drain the microtask queue so resolved Promises settle.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe("useLobbyPolling — integration (state machine)", () => {
  const getLobby = vi.mocked(testsApi.getLobby);

  beforeEach(() => {
    vi.useFakeTimers();
    getLobby.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ── Core state machine: waiting → ready → in_progress ─────────────────────

  it("waiting → ready → in_progress triggers onNavigate with attempt id", async () => {
    // Sequence: 1st call → waiting, 2nd call → ready, 3rd call → in_progress
    getLobby
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
      )
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "ready" as const, attempt: ATTEMPT })
      )
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "in_progress" as const, attempt: ATTEMPT })
      );

    const onNavigate = vi.fn();

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "TEST01", enabled: true, onNavigate })
    );

    // ── After first (immediate) poll resolves: state = "waiting" ──────────
    await tick(); // let the first poll's Promise settle
    expect(result.current.lobbyState?.state).toBe("waiting");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // ── Advance 10 s → second poll fires → state = "ready" ────────────────
    await tick(10_000);
    expect(result.current.lobbyState?.state).toBe("ready");
    expect(result.current.error).toBeNull();

    // ── Advance another 10 s → third poll fires → state = "in_progress" ───
    await tick(10_000);

    // onNavigate called with the attempt id.
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("att_123");

    // Polling stops: no further getLobby calls after the in_progress transition.
    const callsAtTerminal = getLobby.mock.calls.length;
    await tick(20_000);
    expect(getLobby).toHaveBeenCalledTimes(callsAtTerminal);
  });

  // ── Requirement 3.2: polling interval is exactly 10 s ─────────────────────

  it("polls at 10-second intervals after each response (Req 3.2)", async () => {
    getLobby.mockReturnValue(
      apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
    );

    renderHook(() =>
      useLobbyPolling({ code: "WAIT01", enabled: true })
    );

    // 1st poll fires immediately on mount.
    await tick();
    expect(getLobby).toHaveBeenCalledTimes(1);

    // At 9.9 s the 2nd poll has not fired yet.
    await tick(9_900);
    expect(getLobby).toHaveBeenCalledTimes(1);

    // At exactly 10 s the 2nd poll fires.
    await tick(100);
    expect(getLobby).toHaveBeenCalledTimes(2);

    // Another 10 s → 3rd poll.
    await tick(10_000);
    expect(getLobby).toHaveBeenCalledTimes(3);
  });

  // ── Requirement 3.3: degraded indicator on rejection ─────────────────────

  it("sets isDegraded=true and continues polling when getLobby rejects (Req 3.3)", async () => {
    // 1st call rejects (network error), 2nd call succeeds.
    getLobby
      .mockRejectedValueOnce(new Error("Network error"))
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
      );

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "ERR01", enabled: true })
    );

    // After the failing first poll: isDegraded is true, error is set.
    await tick();
    expect(result.current.isDegraded).toBe(true);
    expect(result.current.error).toBe("Network error");

    // After 10 s the second (successful) poll clears degraded state.
    await tick(10_000);
    expect(result.current.error).toBeNull();
    expect(result.current.lobbyState?.state).toBe("waiting");
    expect(getLobby).toHaveBeenCalledTimes(2);
  });

  it("sets isDegraded=true and continues polling when getLobby returns success=false (Req 3.3)", async () => {
    // 1st response is a server-level error, 2nd succeeds.
    getLobby
      .mockReturnValueOnce(apiErr("Server error"))
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
      );

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "APIERR", enabled: true })
    );

    await tick();
    expect(result.current.isDegraded).toBe(true);
    expect(result.current.error).toBe("Server error");

    // Polling continues — second call resolves cleanly.
    await tick(10_000);
    expect(result.current.lobbyState?.state).toBe("waiting");
    expect(result.current.isDegraded).toBe(false);
  });

  // ── Requirement 3.6: "ended" state stops polling ──────────────────────────

  it("stops polling when state transitions to 'ended' (Req 3.6)", async () => {
    getLobby
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
      )
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "ended" as const, attempt: null })
      );

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "END01", enabled: true })
    );

    await tick();
    expect(result.current.lobbyState?.state).toBe("waiting");

    await tick(10_000);
    expect(result.current.lobbyState?.state).toBe("ended");

    const callsAtEnd = getLobby.mock.calls.length;

    // No further polls after "ended".
    await tick(30_000);
    expect(getLobby).toHaveBeenCalledTimes(callsAtEnd);
  });

  // ── enabled: false → no polls ─────────────────────────────────────────────

  it("does not poll when enabled is false", async () => {
    getLobby.mockReturnValue(
      apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
    );

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "NOPOLL", enabled: false })
    );

    await tick(30_000);

    expect(getLobby).not.toHaveBeenCalled();
    expect(result.current.lobbyState).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  // ── enabled: false → true triggers immediate poll ─────────────────────────

  it("starts polling immediately when enabled transitions from false to true", async () => {
    getLobby.mockReturnValue(
      apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
    );

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useLobbyPolling({ code: "FLIP01", enabled }),
      { initialProps: { enabled: false } }
    );

    // No polls while disabled.
    await tick(5_000);
    expect(getLobby).not.toHaveBeenCalled();

    // Flip enabled to true — first poll should fire immediately.
    await act(async () => {
      rerender({ enabled: true });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getLobby).toHaveBeenCalledTimes(1);
    expect(result.current.lobbyState?.state).toBe("waiting");
  });

  // ── Cleanup: polling stops on unmount ────────────────────────────────────

  it("stops polling after the hook unmounts", async () => {
    getLobby.mockReturnValue(
      apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
    );

    const { unmount } = renderHook(() =>
      useLobbyPolling({ code: "UNMNT", enabled: true })
    );

    await tick();
    expect(getLobby).toHaveBeenCalledTimes(1);

    // Unmount — the scheduled next-poll timer should be cancelled.
    unmount();

    const callsAtUnmount = getLobby.mock.calls.length;

    await tick(30_000);
    // No new calls after unmount.
    expect(getLobby).toHaveBeenCalledTimes(callsAtUnmount);
  });

  // ── isLoading is true before first poll resolves ──────────────────────────

  it("sets isLoading=true while a poll is in flight and false when it resolves", async () => {
    let resolveFirst!: (v: { success: true; data: { test: typeof TEST_META; state: "waiting"; attempt: null } }) => void;
    const pending = new Promise<{ success: true; data: { test: typeof TEST_META; state: "waiting"; attempt: null } }>((res) => {
      resolveFirst = res;
    });

    getLobby.mockReturnValueOnce(
      // Cast needed because the pending type isn't the full union, but it satisfies the mock
      pending as unknown as ReturnType<typeof testsApi.getLobby>
    );

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "LOAD01", enabled: true })
    );

    // Hook has just called getLobby; setIsLoading(true) was called before await
    // so after a microtask the state should reflect true.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(true);

    // Resolve the in-flight call.
    await act(async () => {
      resolveFirst({ success: true, data: { test: TEST_META, state: "waiting", attempt: null } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.lobbyState?.state).toBe("waiting");
  });

  // ── isDegraded clears on successful fast poll ─────────────────────────────

  it("clears isDegraded once a healthy (fast) response arrives", async () => {
    getLobby
      .mockRejectedValueOnce(new Error("timeout"))
      .mockReturnValueOnce(
        apiOk({ test: TEST_META, state: "waiting" as const, attempt: null })
      );

    const { result } = renderHook(() =>
      useLobbyPolling({ code: "HEAL01", enabled: true })
    );

    // After the first failing poll isDegraded is true.
    await tick();
    expect(result.current.isDegraded).toBe(true);

    // After the second (fast) poll isDegraded clears.
    await tick(10_000);
    expect(result.current.isDegraded).toBe(false);
  });
});
