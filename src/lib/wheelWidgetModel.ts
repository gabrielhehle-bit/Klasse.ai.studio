/** Pure wheel rules: duplicate labels represent separate, equally likely segments. */
export function availableWheelIndices(
  count: number,
  history: readonly number[],
  withoutReplacement: boolean,
): number[] {
  const drawn = withoutReplacement ? new Set(history) : new Set<number>();
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => index)
    .filter(index => !drawn.has(index));
}

/** Rotate the center of the selected 12-o'clock segment to the fixed top pointer. */
export function wheelTargetRotation(
  previousRotation: number,
  selectedIndex: number,
  segmentCount: number,
  jitterFraction = 0,
): number {
  if (segmentCount < 2 || selectedIndex < 0 || selectedIndex >= segmentCount) {
    throw new RangeError('The wheel needs at least two segments and a valid winner.');
  }
  const segmentWidth = 360 / segmentCount;
  const jitter = Math.max(-0.2, Math.min(0.2, jitterFraction)) * segmentWidth;
  const targetModulo = ((360 - (selectedIndex + 0.5) * segmentWidth + jitter) % 360 + 360) % 360;
  const previousModulo = ((previousRotation % 360) + 360) % 360;
  return previousRotation + 1800 + ((targetModulo - previousModulo + 360) % 360);
}
