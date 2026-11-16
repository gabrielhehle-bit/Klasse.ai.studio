import type { ClassRoom } from '../types';
import { classRoomWithoutTeamMetadata } from './teamTeachingCrypto';

/** Require actual locally available classroom content, never a blank placeholder. */
export function hasRecoverableLocalClassData(room: ClassRoom): boolean {
  if ((room.schueler || []).length > 0) return true;
  if ((room.notes || []).length > 0) return true;
  const weeks = room.wochenplanung || {};
  return Object.values(weeks).some(week =>
    week && typeof week === 'object'
    && Object.values(week).some(day =>
      day && typeof day === 'object'
      && Object.values(day).some(lesson => lesson && typeof lesson === 'object'
        && Object.keys(lesson).length > 0)));
}

/**
 * Start a NEW encrypted team from an explicitly selected local owner snapshot.
 * The former team class, its server history and the other teacher's local copy
 * are intentionally untouched. This does NOT decrypt or restore old ciphertext.
 */
export function prepareLocalTeamRecoveryRoom(local: ClassRoom, newId: string): ClassRoom {
  if (!local.teamTeaching?.sharedClassId) {
    throw new Error('Diese Klasse ist nicht mit dem bisherigen Klassenteam verknüpft.');
  }
  if (!/^[a-f0-9-]{36}$/i.test(newId) || newId === local.id) {
    throw new Error('Für den neuen Klassenstand konnte keine unabhängige Kennung erstellt werden.');
  }
  if (!local.name?.trim()) throw new Error('Die Klasse hat keine gültige Bezeichnung.');
  // The inaccessible original is never silently replaced by an empty placeholder.
  if (!hasRecoverableLocalClassData(local)) {
    throw new Error('Auf diesem Gerät sind keine vollständigen Klasseneinträge erkennbar. Bitte die lokale Sicherung prüfen, bevor ein neues Klassenteam angelegt wird.');
  }
  const independent = classRoomWithoutTeamMetadata(local);
  return {
    ...independent,
    id: newId,
    name: local.name.trim() + ' – Neustart',
  };
}
