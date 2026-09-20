import type { StudentGridLayout } from './studentWidgetGrid';

/** Reserve room for the heading, action bars and actual card text/touch areas.
 * Widget rendering must not silently omit individual students.
 */
export const CHECK_IN_GRID_OPTIONS = {
  reservedHeight: 168,
  minCardWidth: 185,
  minCardHeight: 64,
  gap: 6,
} as const;

/** A narrow or physically too small widget shows counts and a clear expand
 * action. It must never render a hidden list of partly inaccessible children.
 */
export function shouldShowCheckInSummary(width: number, gridFits: StudentGridLayout['fits']): boolean {
  return width < 380 || (!gridFits && width < 550);
}
