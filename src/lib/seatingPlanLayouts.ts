import type { SavedSeatingLayout, SitzplanRegel } from '../types';

export type SeatPositions = Record<string, { x: number; y: number }>;
export type RoomFurniture = any[];

const clone = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

/** A saved arrangement is a snapshot, not a reference to the editable working plan. */
export function createSeatingLayout(
  id: string, name: string, positions: SeatPositions, objects: RoomFurniture,
  rules: SitzplanRegel[] = [], createdAt = new Date().toISOString()
): SavedSeatingLayout {
  return {
    id,
    name: name.trim().slice(0, 60),
    positions: clone(positions),
    objects: clone(objects),
    rules: clone(rules),
    createdAt
  };
}

export function resolveSeatingLayout(
  layout: SavedSeatingLayout,
  currentStudentIds: readonly string[]
): { positions: SeatPositions; objects: RoomFurniture; rules: SitzplanRegel[] | undefined } {
  // An older snapshot must never reintroduce children removed from a class.
  const allowed = new Set(currentStudentIds);
  const positions: SeatPositions = {};
  for (const [id, position] of Object.entries(layout.positions || {})) {
    if (allowed.has(id) && position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      positions[id] = { x: position.x, y: position.y };
    }
  }
  return {
    positions,
    objects: clone(Array.isArray(layout.objects) ? layout.objects : []),
    rules: Array.isArray(layout.rules) ? clone(layout.rules) : undefined,
  };
}

export function sameSeatingArrangement(
  layout: SavedSeatingLayout,
  positions: SeatPositions,
  objects: RoomFurniture,
  rules: SitzplanRegel[] = []
): boolean {
  return JSON.stringify(layout.positions) === JSON.stringify(positions)
    && JSON.stringify(layout.objects) === JSON.stringify(objects)
    && JSON.stringify(layout.rules || []) === JSON.stringify(rules);
}

/** Removing a student must erase their seat and rule references from every saved layout. */
export function omitStudentFromSeatingLayouts(
  layouts: SavedSeatingLayout[] | undefined,
  studentId: string
): SavedSeatingLayout[] {
  return (layouts || []).map(layout => ({
    ...layout,
    positions: Object.fromEntries(
      Object.entries(layout.positions || {}).filter(([id]) => id !== studentId)
    ),
    rules: layout.rules?.map(rule => ({
      ...rule,
      schuelerIds: (rule.schuelerIds || []).filter(id => id !== studentId)
    })).filter(rule => rule.schuelerIds.length >=
      (rule.typ === 'nebeneinander' || rule.typ === 'nicht_nebeneinander' ? 2 : 1)
    )
  }));
}
