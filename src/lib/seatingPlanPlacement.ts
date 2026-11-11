export type SeatPoint = { x: number; y: number };
export type SeatingObject = { type?: string; x: number; y: number; w?: number; h?: number; rotation?: number };

/**
 * Suggests the next free seat by a table before using a clear fallback area.
 * Read-only calculation: never moves children or changes a saved layout itself.
 */
export function findFreeDeskSeatPosition(
  positions: Record<string, SeatPoint>,
  objects: SeatingObject[]
): SeatPoint | null {
  const occupied = Object.values(positions).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  const clear = (x: number, y: number) =>
    occupied.every(p => Math.abs(p.x - x) >= 106 || Math.abs(p.y - y) >= 62);
  const desks = objects.filter(o =>
    ['rectangle', 'square', 'triangle'].includes(o.type || '') &&
    Number.isFinite(o.x) && Number.isFinite(o.y) &&
    Math.abs(Number(o.rotation || 0) % 180) < 1
  );
  for (const desk of desks) {
    const width = Math.max(80, Number(desk.w) || 120);
    const height = Math.max(60, Number(desk.h) || 80);
    const y = Math.max(10, Math.round(desk.y + (height - 72) / 2));
    const columns = width >= 210
      ? [desk.x + 4, desk.x + width - 116]
      : [desk.x + (width - 112) / 2];
    for (const candidateX of columns) {
      const x = Math.max(10, Math.round(candidateX));
      if (clear(x, y)) return { x, y };
    }
  }
  return null;
}

/** Only new placements fall back to an individual place; moving a child to a desk never does. */
export function findNextFreeSeatPosition(
  positions: Record<string, SeatPoint>,
  objects: SeatingObject[]
): SeatPoint {
  const byDesk = findFreeDeskSeatPosition(positions, objects);
  if (byDesk) return byDesk;
  const occupied = Object.values(positions).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  const clear = (x: number, y: number) =>
    occupied.every(p => Math.abs(p.x - x) >= 106 || Math.abs(p.y - y) >= 62);
  // No vacant table position: use a predictable, collision-free individual seat.
  for (let row = 0; row < 40; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 100 + 130 * col;
      const y = 250 + 90 * row;
      if (clear(x, y)) return { x, y };
    }
  }
  return { x: 100, y: 250 };
}
