/**
 * Converts milliseconds to an HH:MM:SS formatted string.
 * Hours can exceed 99 (minimum 2-digit zero-padded).
 * Minutes and seconds are always 2 digits (00–59).
 * Never returns negative values for ms >= 0.
 */
export function formatTimeHHMMSS(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

/**
 * Converts milliseconds to an MM:SS formatted string (for admin monitor).
 * Minutes can exceed 99.
 * Seconds are always 2 digits (00–59).
 */
export function formatTimeMMSS(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${mm}:${ss}`;
}

/**
 * Returns a color state based on remaining time in milliseconds.
 * - "critical" if remainingMs <= 60_000 (1 minute or less)
 * - "warning"  if remainingMs <= 300_000 (5 minutes or less)
 * - "default"  otherwise
 */
export function timerColorState(
  remainingMs: number
): "default" | "warning" | "critical" {
  if (remainingMs <= 60_000) return "critical";
  if (remainingMs <= 300_000) return "warning";
  return "default";
}
