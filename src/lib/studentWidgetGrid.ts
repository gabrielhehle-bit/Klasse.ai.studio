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

/** Fit the complete sidebar roster into the measured list area, including its gaps. */
export function getCompactStudentGridLayout(width: number, height: number, count: number): StudentGridLayout {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const usableWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const usableHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  const gap = 4;
  const minCardHeight = 52;
  const maxColumns = Math.max(1, Math.floor((usableWidth + gap) / 104));
  const rowsThatFit = Math.max(1, Math.floor((usableHeight + gap) / (minCardHeight + gap)));
  const columns = Math.max(1, Math.min(n || 1, maxColumns, Math.max(usableWidth >= 260 ? 2 : 1, Math.ceil(n / rowsThatFit))));
  const rows = Math.max(1, Math.ceil(n / columns));
  const cardHeight = (usableHeight - gap * (rows - 1)) / rows;
  return { columns, rows, cardHeight, fits: n === 0 || cardHeight >= minCardHeight };
}
