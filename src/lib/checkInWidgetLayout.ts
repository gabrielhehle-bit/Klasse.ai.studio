import type { StudentGridLayout } from './studentWidgetGrid';

/** Reserve room for the heading, action bars and actual card text/touch areas.
 * Widget rendering must not silently omit individual students.
 */
export const CHECK_IN_GRID_OPTIONS = {
  reservedHeight: 146,
  minCardWidth: 155,
  minCardHeight: 64,
  gap: 6,
} as const;

/** A small cockpit frame has one concise header and no duplicate footer.
 * Keep tap targets at least 48px high and use any remaining room for the pupils.
 * The previous fixed 146px reserve and mandatory 380px summary hid usable names.
 */
export function getAdaptiveCheckInOptions(width: number, height: number) {
  const compactControls = width < 620 || height < 470;
  return {
    compactControls,
    grid: {
      reservedHeight: compactControls ? 82 : 146,
      minCardWidth: compactControls ? 128 : 155,
      minCardHeight: compactControls ? 48 : 64,
      gap: compactControls ? 4 : 6,
      maxColumns: 6,
    },
    pages: {
      reservedHeight: compactControls ? 118 : 218,
      minCardWidth: compactControls ? 128 : 155,
      minCardHeight: compactControls ? 48 : 64,
      gap: compactControls ? 4 : 6,
      maxColumns: 6,
    },
  };
}

/** A narrow or physically too small widget shows counts and a clear expand
 * action. It must never render a hidden list of partly inaccessible children.
 */
export function shouldShowCheckInSummary(width: number, _gridFits: StudentGridLayout['fits'], height = 350): boolean {
  // Only physically unusable frames need the summary. Otherwise show names,
  // either together or on reachable pages INSIDE the current widget window.
  return width < 260 || height < 195;
}

/** Provides a real, non-scrolling student page if the device is too small for
 * the entire class even after the teacher opens the expanded view.
 */
export function getCheckInPageLayout(
  width: number, height: number, count: number, page: number,
  options: { minCardWidth?: number; minCardHeight?: number; reservedHeight?: number; gap?: number; maxColumns?: number } = {},
) {
  const { minCardWidth = CHECK_IN_GRID_OPTIONS.minCardWidth,
    minCardHeight = CHECK_IN_GRID_OPTIONS.minCardHeight,
    reservedHeight = 218, gap = CHECK_IN_GRID_OPTIONS.gap,
    maxColumns = 7 } = options;
  const usableW = Number.isFinite(width) ? Math.max(0, width - 24) : 0;
  // Reserve the true compact header, pager, borders and touch-safe controls.
  const usableH = Number.isFinite(height) ? Math.max(0, height - reservedHeight) : 0;
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((usableW + gap) / (minCardWidth + gap))));
  const rows = Math.max(1, Math.floor((usableH + gap) / (minCardHeight + gap)));
  const pageSize = Math.max(1, columns * rows);
  const pageCount = Math.max(1, Math.ceil(Math.max(0, count) / pageSize));
  const currentPage = Math.max(0, Math.min(pageCount - 1, Number.isFinite(page) ? Math.floor(page) : 0));
  const canRender = usableW >= minCardWidth && usableH >= minCardHeight;
  return { columns, rows, pageSize, pageCount, currentPage, start: currentPage * pageSize, canRender };
}
