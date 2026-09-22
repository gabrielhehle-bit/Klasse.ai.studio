import type { AppState } from '../types';

/**
 * A fresh, never configured account has no established classroom. An existing
 * encrypted account containing only an auto-generated 4th-grade placeholder
 * must NOT be treated as proof that the teacher's real classes were restored.
 * This is intentionally structural: never print, transmit or persist pupils'
 * names, class titles, or subject content as recovery metadata.
 */
export function hasEstablishedClassroom(state: Pick<AppState, 'classes' | 'schueler' | 'wochenplanung'>): boolean {
  if (Array.isArray(state.schueler) && state.schueler.length > 0) return true;
  if (state.wochenplanung && Object.keys(state.wochenplanung).length > 0) return true;
  return Array.isArray(state.classes) && state.classes.some(room => {
    if (!room || typeof room !== 'object') return false;
    if (Array.isArray(room.schueler) && room.schueler.length > 0) return true;
    if (room.wochenplanung && Object.keys(room.wochenplanung).length > 0) return true;
    // Real class IDs are created by the setup, even before students are added.
    return typeof room.id === 'string' && !room.id.startsWith('default-');
  });
}

/** Never let an automated empty/placeholder state replace previously populated
 * classes. Explicit class deletion and data imports must use their separately
 * confirmed backup-first flows, not the background autosave or cloud refresh.
 */
export function isUnexpectedEmptyClassReplacement(previous: AppState, next: AppState): boolean {
  const previouslyPopulated = (previous.schueler?.length || 0) > 0
    || previous.classes?.some(room => (room.schueler?.length || 0) > 0);
  const nextHasStudents = (next.schueler?.length || 0) > 0
    || next.classes?.some(room => (room.schueler?.length || 0) > 0);
  if (previouslyPopulated && !nextHasStudents) return true;
  // Also protect a teacher's prepared class/weekly plan *before* they have
  // entered any children. A fabricated default-4th-grade class is not a
  // replacement for an established classroom.
  return hasEstablishedClassroom(previous) && !hasEstablishedClassroom(next);
}


/**
 * Guard the other dangerous case: a non-empty replacement account may contain
 * a different classroom (e.g. a fabricated fourth grade), so a mere pupil-count
 * check cannot establish that the original first grade survived.
 *
 * A deliberate archive/retirement retains the same stable class ID. Other class
 * deletion/migration requires an explicit, backup-first resolution; background
 * cloud refresh must never silently discard a previously known classroom.
 */
export function hasUnexpectedClassDisappearance(previous: AppState, incoming: AppState): boolean {
  const previousClasses = Array.isArray(previous.classes) ? previous.classes : [];
  const incomingClassIds = new Set([
    ...(Array.isArray(incoming.classes) ? incoming.classes : []),
    ...(Array.isArray(incoming.retiredClasses) ? incoming.retiredClasses : []),
  ].map(room => room?.id).filter((id): id is string => typeof id === 'string' && id.length > 0));

  return previousClasses.some(room => {
    if (!room || typeof room.id !== 'string' || !room.id) return false;
    const established = (room.schueler?.length || 0) > 0
      || !!(room.wochenplanung && Object.keys(room.wochenplanung).length > 0)
      || !room.id.startsWith('default-');
    return established && !incomingClassIds.has(room.id);
  });
}
