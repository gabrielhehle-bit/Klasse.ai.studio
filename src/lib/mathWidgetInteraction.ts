/** Pure helpers shared by the three interactive mathematics cockpit widgets. */
export function numberLineValueAtClick(
  clickX: number, width: number, min: number, max: number,
): number | null {
  // The number line reserves 40 px on either side. In a tiny widget there is
  // no drawable line, so ignore the click instead of producing NaN/Infinity.
  if (![clickX, width, min, max].every(Number.isFinite) || width <= 80 || max <= min) return null;
  const proportion = Math.max(0, Math.min(1, (clickX - 40) / (width - 80)));
  return Math.round(min + proportion * (max - min));
}

/** Never accept a partially parsed response such as '12abc' as 12. */
export function parseWholeNumberAnswer(input: string): number | null {
  const normalized = input.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}
