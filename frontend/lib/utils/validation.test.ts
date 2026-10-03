/**
 * Property-based tests for validation utilities.
 *
 * Property 4 — Lobby entry form rejects empty or overlong fields without a
 *   network request.
 * Property 9 — Test creation form validates duration range.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.9, 6.5
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateLobbyEntry, validateDuration } from "./validation";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * A single non-whitespace character arbitrary.
 * stringMatching with a single-char pattern always produces exactly 1 char.
 */
const nonWsChar = fc.stringMatching(/^\S$/, { minLength: 1, maxLength: 1 });

/**
 * A string of [minLen, maxLen] non-whitespace characters, all joined together.
 * Uses `fc.array` so the total character count is guaranteed.
 */
function nonWhitespaceString(minLen: number, maxLen: number) {
  return fc.array(nonWsChar, { minLength: minLen, maxLength: maxLen }).map((a) => a.join(""));
}

/**
 * A non-empty string composed solely of whitespace characters.
 */
const whitespaceString = fc.stringMatching(/^\s+$/, { minLength: 1, maxLength: 50 });

// ---------------------------------------------------------------------------
// Property 4: Lobby entry form validation
// Validates: Requirements 1.2, 1.3, 1.4, 1.9
// ---------------------------------------------------------------------------

describe("validateLobbyEntry — Property 4", () => {
  /**
   * Happy path: non-whitespace username (1–100 chars) + non-whitespace code
   * (1–50 chars) must return an empty errors object (no errors).
   */
  it("returns {} for any valid username (1-100 non-whitespace) and code (1-50 non-whitespace)", () => {
    fc.assert(
      fc.property(
        nonWhitespaceString(1, 100),
        nonWhitespaceString(1, 50),
        (username, code) => {
          const result = validateLobbyEntry(username, code);
          expect(result).toEqual({});
        }
      )
    );
  });

  /**
   * Empty / whitespace-only username → usernameError must be present.
   */
  it("returns usernameError when username is empty or whitespace-only", () => {
    // Deterministic edge cases
    for (const u of ["", "   ", "\t", "\n", "  \t  "]) {
      const result = validateLobbyEntry(u, "validCode");
      expect(result.usernameError).toBeDefined();
    }

    // Property: any whitespace-only username triggers the error
    fc.assert(
      fc.property(whitespaceString, (whitespace) => {
        const result = validateLobbyEntry(whitespace, "validCode");
        expect(result.usernameError).toBeDefined();
      })
    );
  });

  /**
   * Empty / whitespace-only code → codeError must be present.
   */
  it("returns codeError when code is empty or whitespace-only", () => {
    for (const c of ["", "   ", "\t", "\n"]) {
      const result = validateLobbyEntry("validUser", c);
      expect(result.codeError).toBeDefined();
    }

    fc.assert(
      fc.property(whitespaceString, (whitespace) => {
        const result = validateLobbyEntry("validUser", whitespace);
        expect(result.codeError).toBeDefined();
      })
    );
  });

  /**
   * username.length > 100 → usernameError must be present,
   * regardless of whether the code is valid.
   */
  it("returns usernameError when username exceeds 100 characters", () => {
    fc.assert(
      fc.property(
        nonWhitespaceString(101, 200),
        nonWhitespaceString(1, 50),
        (longUsername, code) => {
          const result = validateLobbyEntry(longUsername, code);
          expect(result.usernameError).toBeDefined();
        }
      )
    );
  });

  /**
   * code.length > 50 → codeError must be present,
   * regardless of whether the username is valid.
   */
  it("returns codeError when code exceeds 50 characters", () => {
    fc.assert(
      fc.property(
        nonWhitespaceString(1, 100),
        nonWhitespaceString(51, 120),
        (username, longCode) => {
          const result = validateLobbyEntry(username, longCode);
          expect(result.codeError).toBeDefined();
        }
      )
    );
  });

  /**
   * Both errors can be present simultaneously when both fields are invalid.
   */
  it("can return both usernameError and codeError at the same time", () => {
    // empty × empty
    expect(validateLobbyEntry("", "")).toEqual({
      usernameError: expect.any(String),
      codeError: expect.any(String),
    });

    // overlong username × overlong code
    fc.assert(
      fc.property(
        nonWhitespaceString(101, 200),
        nonWhitespaceString(51, 120),
        (longUsername, longCode) => {
          const result = validateLobbyEntry(longUsername, longCode);
          expect(result.usernameError).toBeDefined();
          expect(result.codeError).toBeDefined();
        }
      )
    );

    // whitespace username × whitespace code
    fc.assert(
      fc.property(whitespaceString, whitespaceString, (wsUser, wsCode) => {
        const result = validateLobbyEntry(wsUser, wsCode);
        expect(result.usernameError).toBeDefined();
        expect(result.codeError).toBeDefined();
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Duration validation
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------

describe("validateDuration — Property 9", () => {
  /**
   * Any integer in [5, 300] must be accepted.
   */
  it("accepts any integer in the range [5, 300]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 300 }), (d) => {
        const result = validateDuration(d);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      })
    );
  });

  /**
   * Any integer below 5 must be rejected.
   */
  it("rejects any integer below 5", () => {
    fc.assert(
      fc.property(fc.integer({ max: 4 }), (d) => {
        const result = validateDuration(d);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Duration must be between 5 and 300 minutes");
      })
    );
  });

  /**
   * Any integer above 300 must be rejected.
   */
  it("rejects any integer above 300", () => {
    fc.assert(
      fc.property(fc.integer({ min: 301 }), (d) => {
        const result = validateDuration(d);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Duration must be between 5 and 300 minutes");
      })
    );
  });

  /**
   * Non-integer numbers (floats) must be rejected even when numerically in range.
   */
  it("rejects non-integer floats", () => {
    const floats = [5.5, 10.1, 299.9, 5.0000001, 100.5, -0.1];
    for (const d of floats) {
      const result = validateDuration(d);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Duration must be between 5 and 300 minutes");
    }

    fc.assert(
      fc.property(
        fc.float({ min: 5, max: 300, noNaN: true }).filter((n) => !Number.isInteger(n)),
        (d) => {
          const result = validateDuration(d);
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  /**
   * Non-numeric types (string, null, undefined, boolean, object) must be rejected.
   */
  it("rejects non-numeric types", () => {
    const nonNumbers: unknown[] = [
      "5",
      "100",
      null,
      undefined,
      true,
      false,
      {},
      [],
      NaN,
      Infinity,
      -Infinity,
    ];
    for (const d of nonNumbers) {
      const result = validateDuration(d);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Duration must be between 5 and 300 minutes");
    }
  });

  /**
   * Error message is exactly "Duration must be between 5 and 300 minutes"
   * for every rejected input.
   */
  it("always returns the correct error message for invalid inputs", () => {
    fc.assert(
      fc.property(fc.integer({ max: 4 }), (d) => {
        expect(validateDuration(d).error).toBe(
          "Duration must be between 5 and 300 minutes"
        );
      })
    );
    fc.assert(
      fc.property(fc.integer({ min: 301 }), (d) => {
        expect(validateDuration(d).error).toBe(
          "Duration must be between 5 and 300 minutes"
        );
      })
    );
  });
});
