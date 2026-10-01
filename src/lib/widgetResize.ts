export type WidgetResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export interface WidgetResizeRect { x: number; y: number; w: number; h: number }
/** Pixel geometry: the opposite edge stays anchored, with no snapping. */
export function resizeWidgetRect(rect: WidgetResizeRect, direction: WidgetResizeDirection,
  dx: number, dy: number, stage: { width: number; height: number }, minimum: { minW: number; minH: number }): WidgetResizeRect {
  let left = rect.x, right = rect.x + rect.w, top = rect.y, bottom = rect.y + rect.h;
  const minW = Math.min(minimum.minW, stage.width);
  const minH = Math.min(minimum.minH, stage.height);
  if (direction.includes('w')) left = Math.max(0, Math.min(right - minW, left + dx));
  if (direction.includes('e')) right = Math.min(stage.width, Math.max(left + minW, right + dx));
  if (direction.includes('n')) top = Math.max(0, Math.min(bottom - minH, top + dy));
  if (direction.includes('s')) bottom = Math.min(stage.height, Math.max(top + minH, bottom + dy));
  return { x: left, y: top, w: right - left, h: bottom - top };
}
