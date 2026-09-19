export interface SeatingPoint { x: number; y: number }
export interface SeatingRoomObject extends SeatingPoint { w?: number; h?: number }
export interface SeatingViewport { zoom: number; offsetX: number; offsetY: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Compute the displayed view, never mutate the saved seating coordinates.
 * Coordinates include every placed child and every room object, including the board.
 * The result uses CSS translate(x, y) scale(zoom), in viewport pixels.
 */
export function fitSeatingPlanViewport(
  viewportWidth: number,
  viewportHeight: number,
  seats: SeatingPoint[],
  objects: SeatingRoomObject[],
  margin = 32
): SeatingViewport {
  const rectangles = [
    ...seats.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
      .map(p => ({ x: p.x, y: p.y, w: 112, h: 72 })),
    ...objects.filter(o => Number.isFinite(o.x) && Number.isFinite(o.y))
      .map(o => ({ x: o.x, y: o.y, w: Math.max(1, o.w || 100), h: Math.max(1, o.h || 60) })),
  ];
  if (!rectangles.length || viewportWidth <= 0 || viewportHeight <= 0) {
    return { zoom: 1, offsetX: 0, offsetY: 0 };
  }
  const left = Math.min(...rectangles.map(r => r.x));
  const top = Math.min(...rectangles.map(r => r.y));
  const right = Math.max(...rectangles.map(r => r.x + r.w));
  const bottom = Math.max(...rectangles.map(r => r.y + r.h));
  const roomWidth = Math.max(1, right - left);
  const roomHeight = Math.max(1, bottom - top);
  const availableWidth = Math.max(1, viewportWidth - margin * 2);
  const availableHeight = Math.max(1, viewportHeight - margin * 2);
  const zoom = clamp(Math.min(availableWidth / roomWidth, availableHeight / roomHeight), 0.1, 1.5);
  return {
    zoom,
    offsetX: (viewportWidth - roomWidth * zoom) / 2 - left * zoom,
    offsetY: (viewportHeight - roomHeight * zoom) / 2 - top * zoom,
  };
}
