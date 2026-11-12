/**
 * Only existing, assessed learning areas may be shown on the compact KEL A4
 * parent sheet. Undefined selection preserves the existing default (first 4).
 * An explicit empty selection means that no learning areas were released for
 * this print session. Never create or infer assessment values.
 */
export function selectKelParentLearningAreas<T extends { area: string }>(
  documented: readonly T[],
  selected?: readonly string[],
): T[] {
  if (!selected) return documented.slice(0, 4);
  const chosen = new Set(selected);
  return documented.filter(row => chosen.has(row.area)).slice(0, 4);
}
