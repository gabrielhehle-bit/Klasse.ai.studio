/**
 * Classroom-friendly grid sizing for student check-in and public plus points.
 * A tiny widget cannot physically fit 25 touch targets. In that case the
 * caller renders a clear "large view" action rather than silently clipping
 * children or hiding them in an internal scrollbar.
 */
export type StudentGridLayout = { columns: number; rows: number; cardHeight: number; fits: boolean };

export function getStudentGridLayout(
  width: number,
  height: number,
  count: number,
  options: { minCardWidth?: number; minCardHeight?: number; reservedHeight?: number; gap?: number; maxColumns?: number } = {},
): StudentGridLayout {
  const {
    minCardWidth = 175,
    minCardHeight = 52,
    reservedHeight = 110,
    gap = 6,
    maxColumns = 7,
  } = options;
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const usableW = Number.isFinite(width) ? Math.max(0, width - 24) : 0;
  const usableH = Number.isFinite(height) ? Math.max(0, height - reservedHeight) : 0;
  const cols = Math.max(1, Math.min(n || 1, maxColumns, Math.floor((usableW + gap) / (minCardWidth + gap))));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cardHeight = Math.floor((usableH - gap * (rows - 1)) / rows);
  return {
    columns: cols,
    rows,
    cardHeight: Math.max(minCardHeight, cardHeight),
    fits: n === 0 || (usableW >= minCardWidth && cardHeight >= minCardHeight),
  };
}
