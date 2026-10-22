/**
 * Class dossier behavior is a rank, not a score: 1 is best and must render
 * at the top of a normal bottom-to-top numeric Recharts Y axis.
 *
 * Transform only plotted coordinates; stored feedback and all statistics keep
 * their original 1..max ranks. The transform is its own inverse so the axis
 * labels and tooltip can always show the original ranks.
 */
export function behaviorChartCoordinate(rank: number | null, stageCount: number): number | null {
  if (rank === null || !Number.isFinite(rank) || !Number.isInteger(stageCount) || stageCount < 2) return null;
  return stageCount + 1 - rank;
}
