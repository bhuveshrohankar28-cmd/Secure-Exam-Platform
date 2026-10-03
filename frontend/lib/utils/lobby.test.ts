/**
 * Property 5: Acknowledgment checkboxes gate the Start Exam button
 *
 * Validates: Requirements 2.4, 2.5, 2.6
 *
 * For any array of boolean acknowledgment checkbox states, allAcknowledged
 * returns true iff every element is true.
 */
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { allAcknowledged } from './lobby';

describe('allAcknowledged', () => {
  // Property 5: for any boolean[], allAcknowledged matches every()
  it('Property 5: matches arr.every(x => x === true) for any boolean array', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean()), (arr) => {
        return allAcknowledged(arr) === arr.every((x) => x === true);
      })
    );
  });

  // Edge cases
  it('returns true for an empty array (vacuously true)', () => {
    expect(allAcknowledged([])).toBe(true);
  });

  it('returns true for a single-element true array', () => {
    expect(allAcknowledged([true])).toBe(true);
  });

  it('returns false for a single-element false array', () => {
    expect(allAcknowledged([false])).toBe(false);
  });

  it('returns false when any element is false', () => {
    expect(allAcknowledged([true, false])).toBe(false);
  });

  it('returns true when all elements are true', () => {
    expect(allAcknowledged([true, true])).toBe(true);
  });
});
