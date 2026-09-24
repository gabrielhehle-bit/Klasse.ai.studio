/** Only a deliberate, valid target changes the existing class-wide goal. */
export function validateClassGoalInput(value: unknown): { goal: number; error: '' } | { goal: null; error: string } {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1000)
    return { goal: null, error: 'Bitte eine ganze Zielzahl zwischen 1 und 1000 eingeben.' };
  return { goal: value, error: '' };
}
export function nextClassGoalCount(count: unknown, delta: 1 | -1): number {
  const current = typeof count === 'number' && Number.isFinite(count)
    ? Math.max(0, Math.floor(count)) : 0;
  return Math.max(0, current + delta);
}
