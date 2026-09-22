/** Place a reason dropdown relative to its trigger, not to the clipped
 * attendance list. A scrolled bottom row must always have usable options. */
export function getAttendanceReasonMenuPlacement(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'right'>,
  viewportWidth: number,
  viewportHeight: number,
): { top: number; left: number; maxHeight: number } {
  const margin = 8;
  const gap = 4;
  const menuWidth = Math.min(240, Math.max(0, viewportWidth - margin * 2));
  const below = Math.max(0, viewportHeight - anchor.bottom - margin - gap);
  const above = Math.max(0, anchor.top - margin - gap);
  const showAbove = below < 300 && above > below;
  const maxHeight = Math.min(320, showAbove ? above : below);
  return {
    top: showAbove ? Math.max(margin, anchor.top - gap - maxHeight) : anchor.bottom + gap,
    left: Math.max(margin, Math.min(anchor.right - menuWidth, viewportWidth - menuWidth - margin)),
    maxHeight,
  };
}
