/**
 * A parent sheet starts with four documented learning areas per subject to
 * stay compact on A4. Once the teacher makes an explicit selection, display
 * ALL selected, actually assessed areas. Never silently discard a fifth area.
 * Long reports may use additional print pages; no score is invented or saved.
 */
export function selectKelParentLearningAreas<T extends { area: string }>(
  documented: readonly T[],
  selected?: readonly string[],
): T[] {
  if (selected === undefined) return documented.slice(0, 4);
  const chosen = new Set(selected);
  return documented.filter(row => chosen.has(row.area));
}
