/**
 * Returns `true` if every element in `checkboxStates` is `true`.
 *
 * Vacuously true for an empty array (no unchecked boxes).
 * Returns `false` if any element is `false`.
 */
export function allAcknowledged(checkboxStates: boolean[]): boolean {
  return checkboxStates.every((state) => state === true);
}
