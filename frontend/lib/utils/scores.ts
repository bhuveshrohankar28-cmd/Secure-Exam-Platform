/**
 * Computes a rounded percentage score.
 * Returns 0.0 when totalMarks is 0 to avoid division by zero.
 */
export function computePercentage(score: number, totalMarks: number): number {
  if (totalMarks === 0) return 0.0;
  return Math.round((score / totalMarks) * 100 * 10) / 10;
}
