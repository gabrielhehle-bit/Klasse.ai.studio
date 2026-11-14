/** Safe one-click completion for a teacher's *draft* weighting.
 * Never touches stored marks or changes any other category.
 */
export const WEIGHT_KEYS = ['sa', 'lzk', 'wp', 'obj', 'mi', 'hue'] as const;
export type WeightKey = typeof WEIGHT_KEYS[number];
export type WeightDraft = Partial<Record<WeightKey, number>>;

export function getWeightDraftSum(weights: WeightDraft): number {
  return WEIGHT_KEYS.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
}

/** Returns null rather than altering invalid or already complete drafts. */
export function fillRemainingWeight<T extends WeightDraft>(weights: T, target: WeightKey): T | null {
  const values = WEIGHT_KEYS.map(key => weights[key] ?? 0);
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) return null;
  const remainder = 100 - getWeightDraftSum(weights);
  if (remainder <= 0 || !Number.isFinite(remainder)) return null;
  const current = weights[target] ?? 0;
  if (current + remainder > 100) return null;
  return { ...weights, [target]: current + remainder };
}
