/**
 * An empty behavior log is "not evaluated", never a 100% success rate.
 * Keep the denominator consistent with the gradebook's existing log count.
 */
export function getPositiveBehaviorRate(positiveCount: number, totalCount: number): number | null {
  if (!Number.isFinite(positiveCount) || !Number.isFinite(totalCount) || totalCount <= 0) return null;
  return Math.round((positiveCount / totalCount) * 100);
}
