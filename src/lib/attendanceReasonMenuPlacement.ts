/** Place the attendance reason dropdown in the viewport, anchored flush to
 * the clicked button. Above-placement uses CSS bottom instead of estimating
 * the dropdown's height: its actual content height can vary with fonts/zoom. */
export type AttendanceReasonMenuPlacement = {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
  direction: 'above' | 'below';
};

export function getAttendanceReasonMenuPlacement(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'right'>,
  viewportWidth: number,
  viewportHeight: number,
): AttendanceReasonMenuPlacement {
  const margin = 8;
  const gap = 4;
  const menuWidth = Math.min(240, Math.max(0, viewportWidth - margin * 2));
  const below = Math.max(0, viewportHeight - anchor.bottom - margin - gap);
  const above = Math.max(0, anchor.top - margin - gap);
  // The menu normally needs ~270px. If it cannot fit below, place it directly
  // above the trigger, keeping its natural height rather than a blank gap.
  const showAbove = below < 288 && above > below;
  const maxHeight = Math.min(320, showAbove ? above : below);
  const left = Math.max(margin, Math.min(anchor.right - menuWidth, viewportWidth - menuWidth - margin));
  return showAbove
    ? { bottom: Math.max(margin, viewportHeight - anchor.top + gap), left, maxHeight, direction: 'above' }
    : { top: Math.max(margin, anchor.bottom + gap), left, maxHeight, direction: 'below' };
}
