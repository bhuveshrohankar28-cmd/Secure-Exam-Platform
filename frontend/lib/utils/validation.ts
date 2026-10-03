/**
 * Validates the lobby entry form fields (username and test code).
 *
 * Rules:
 * - Username: required (non-empty/non-whitespace), max 100 characters
 * - Code: required (non-empty/non-whitespace), max 50 characters
 *
 * Both errors can be present simultaneously.
 * Returns {} when both fields are valid.
 */
export function validateLobbyEntry(
  username: string,
  code: string
): { usernameError?: string; codeError?: string } {
  const errors: { usernameError?: string; codeError?: string } = {};

  if (username.trim().length === 0) {
    errors.usernameError = "Username is required";
  } else if (username.length > 100) {
    errors.usernameError = "Username must be 100 characters or fewer";
  }

  if (code.trim().length === 0) {
    errors.codeError = "Test Code is required";
  } else if (code.length > 50) {
    errors.codeError = "Test Code must be 50 characters or fewer";
  }

  return errors;
}

/**
 * Validates a duration value for the test creation form.
 *
 * Accepts only integers in the inclusive range 5–300.
 * Any non-integer, non-numeric, or out-of-range value is rejected.
 */
export function validateDuration(d: unknown): { valid: boolean; error?: string } {
  const INVALID = {
    valid: false,
    error: "Duration must be between 5 and 300 minutes",
  } as const;

  if (typeof d !== "number" || !Number.isInteger(d)) return INVALID;
  if (d < 5 || d > 300) return INVALID;

  return { valid: true };
}
