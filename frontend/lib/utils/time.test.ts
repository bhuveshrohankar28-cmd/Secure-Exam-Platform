/**
 * Property-based tests for timer utility functions.
 *
 * Property 1: Exam timer formatted as HH:MM:SS
 *   Validates: Requirements 4.1, 19.1
 *
 * Property 3: Timer color state is determined solely by remaining time
 *   Validates: Requirements 4.8, 19.3, 19.4
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatTimeHHMMSS, timerColorState } from "./time";

// ---------------------------------------------------------------------------
// Property 1: Exam timer formatted as HH:MM:SS
// Validates: Requirements 4.1, 19.1
// ---------------------------------------------------------------------------

describe("formatTimeHHMMSS — Property 1: Exam timer formatted as HH:MM:SS", () => {
  it("matches /^\\d{2,}:\\d{2}:\\d{2}$/ for any non-negative integer ms", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (ms) => {
        const result = formatTimeHHMMSS(ms);
        expect(result).toMatch(/^\d{2,}:\d{2}:\d{2}$/);
      })
    );
  });

  it("returns correct HH, MM, SS decomposition for any non-negative integer ms", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (ms) => {
        const result = formatTimeHHMMSS(ms);

        const totalSec = Math.floor(ms / 1000);
        const expectedHH = Math.floor(totalSec / 3600);
        const expectedMM = Math.floor((totalSec % 3600) / 60);
        const expectedSS = totalSec % 60;

        const [hhStr, mmStr, ssStr] = result.split(":");
        const parsedHH = parseInt(hhStr, 10);
        const parsedMM = parseInt(mmStr, 10);
        const parsedSS = parseInt(ssStr, 10);

        expect(parsedHH).toBe(expectedHH);
        expect(parsedMM).toBe(expectedMM);
        expect(parsedSS).toBe(expectedSS);
      })
    );
  });

  it("never returns negative component values for ms >= 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (ms) => {
        const result = formatTimeHHMMSS(ms);
        const [hhStr, mmStr, ssStr] = result.split(":");
        expect(parseInt(hhStr, 10)).toBeGreaterThanOrEqual(0);
        expect(parseInt(mmStr, 10)).toBeGreaterThanOrEqual(0);
        expect(parseInt(ssStr, 10)).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it("minutes and seconds are always 0–59", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (ms) => {
        const result = formatTimeHHMMSS(ms);
        const [, mmStr, ssStr] = result.split(":");
        const mm = parseInt(mmStr, 10);
        const ss = parseInt(ssStr, 10);
        expect(mm).toBeGreaterThanOrEqual(0);
        expect(mm).toBeLessThanOrEqual(59);
        expect(ss).toBeGreaterThanOrEqual(0);
        expect(ss).toBeLessThanOrEqual(59);
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Timer color state is determined solely by remaining time
// Validates: Requirements 4.8, 19.3, 19.4
// ---------------------------------------------------------------------------

describe("timerColorState — Property 3: Timer color state determined solely by remaining time", () => {
  it("returns 'critical' for any ms <= 60_000", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 60_000 }), (ms) => {
        expect(timerColorState(ms)).toBe("critical");
      })
    );
  });

  it("returns 'warning' for any ms in (60_000, 300_000]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 60_001, max: 300_000 }), (ms) => {
        expect(timerColorState(ms)).toBe("warning");
      })
    );
  });

  it("returns 'default' for any ms > 300_000", () => {
    fc.assert(
      fc.property(fc.integer({ min: 300_001, max: 2 ** 31 - 1 }), (ms) => {
        expect(timerColorState(ms)).toBe("default");
      })
    );
  });

  it("returns exactly one valid state for any non-negative ms", () => {
    const validStates = new Set(["critical", "warning", "default"]);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (ms) => {
        const state = timerColorState(ms);
        expect(validStates.has(state)).toBe(true);
      })
    );
  });

  it("boundary: exactly 60_000 ms is critical, 60_001 ms is warning", () => {
    expect(timerColorState(60_000)).toBe("critical");
    expect(timerColorState(60_001)).toBe("warning");
  });

  it("boundary: exactly 300_000 ms is warning, 300_001 ms is default", () => {
    expect(timerColorState(300_000)).toBe("warning");
    expect(timerColorState(300_001)).toBe("default");
  });
});
