/** Sizing for the movable public plus-points widget, never the right sidebar.
 * All student entries stay reachable without a scrollable panel in the widget.
 */
export const PLUS_POINTS_GRID_OPTIONS = {
  reservedHeight: 138,
  minCardWidth: 190,
  minCardHeight: 88,
  gap: 6,
} as const;

export function getPlusPointsPageLayout(width: number, height: number, count: number, requestedPage: number) {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width - 16) : 0;
  // Heading, single undo control, paging, padding and grid gaps.
  const safeHeight = Number.isFinite(height) ? Math.max(0, height - 172) : 0;
  const columns = Math.max(1, Math.min(7,
    Math.floor((safeWidth + PLUS_POINTS_GRID_OPTIONS.gap) / (PLUS_POINTS_GRID_OPTIONS.minCardWidth + PLUS_POINTS_GRID_OPTIONS.gap))));
  const rows = Math.max(1,
    Math.floor((safeHeight + PLUS_POINTS_GRID_OPTIONS.gap) / (PLUS_POINTS_GRID_OPTIONS.minCardHeight + PLUS_POINTS_GRID_OPTIONS.gap)));
  const pageSize = columns * rows;
  const pageCount = Math.max(1, Math.ceil(Math.max(0, count) / pageSize));
  const page = Math.max(0, Math.min(pageCount - 1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  const fitsAtLeastOne = safeWidth >= PLUS_POINTS_GRID_OPTIONS.minCardWidth && safeHeight >= PLUS_POINTS_GRID_OPTIONS.minCardHeight;
  return { page, pageSize, pageCount, columns, rows, start: page * pageSize, fitsAtLeastOne };
}
