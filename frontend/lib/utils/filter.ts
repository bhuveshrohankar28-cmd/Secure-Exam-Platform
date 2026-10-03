import { AttemptWithViolations } from "../../types";

/**
 * Returns a new array containing only the items that satisfy the predicate.
 * Preserves order of the original array.
 */
export function filterItems<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

/**
 * Returns a new array of attempts sorted descending by score.
 * Attempts with a null score are placed at the end.
 * The sort is stable: attempts with equal non-null scores preserve their
 * original relative order.
 */
export function sortAttemptsByScore(
  attempts: AttemptWithViolations[]
): AttemptWithViolations[] {
  return [...attempts].sort((a, b) => {
    // Both null → preserve original order (stable)
    if (a.score === null && b.score === null) return 0;
    // a is null → a goes after b
    if (a.score === null) return 1;
    // b is null → b goes after a
    if (b.score === null) return -1;
    // Both non-null → descending order
    return b.score - a.score;
  });
}
