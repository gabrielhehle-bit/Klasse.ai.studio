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

/** A narrow or physically too small widget shows counts and a clear expand
 * action. It must never render a hidden list of partly inaccessible children.
 */
export function shouldShowCheckInSummary(width: number, gridFits: StudentGridLayout['fits']): boolean {
  return width < 380 || (!gridFits && width < 550);
}

/** Provides a real, non-scrolling student page if the device is too small for
 * the entire class even after the teacher opens the expanded view.
 */
export function getCheckInPageLayout(width: number, height: number, count: number, page: number) {
  const usableW = Math.max(0, width - 24);
  // Header, status/footer, page navigation and borders all reserve space.
  const usableH = Math.max(0, height - 218);
  const columns = Math.max(1, Math.min(7, Math.floor((usableW + 6) / (CHECK_IN_GRID_OPTIONS.minCardWidth + 6))));
  const rows = Math.max(1, Math.floor((usableH + 6) / (CHECK_IN_GRID_OPTIONS.minCardHeight + 6)));
  const pageSize = Math.max(1, columns * rows);
  const pageCount = Math.max(1, Math.ceil(Math.max(0, count) / pageSize));
  const currentPage = Math.max(0, Math.min(pageCount - 1, Math.floor(page)));
  const canRender = usableW >= CHECK_IN_GRID_OPTIONS.minCardWidth && usableH >= CHECK_IN_GRID_OPTIONS.minCardHeight;
  return { columns, rows, pageSize, pageCount, currentPage, start: currentPage * pageSize, canRender };
}
