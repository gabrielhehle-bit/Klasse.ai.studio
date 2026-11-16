import type { ClassRoom } from '../types';
import { classRoomWithoutTeamMetadata } from './teamTeachingCrypto';

/**
 * Start a NEW encrypted team from an explicitly selected local owner snapshot.
 * The former team class, its server history and the other teacher's local copy
 * are intentionally untouched. This does NOT decrypt or restore old ciphertext.
 */
export function prepareLocalTeamRecoveryRoom(local: ClassRoom, newId: string): ClassRoom {
  if (!local.teamTeaching?.sharedClassId || local.teamTeaching.role !== 'owner') {
    throw new Error('Nur die Besitzerin bzw. der Besitzer kann aus der eigenen lokalen Klasse einen neuen Teamstand starten.');
  }
  if (!/^[a-f0-9-]{36}$/i.test(newId) || newId === local.id) {
    throw new Error('Für den neuen Klassenstand konnte keine unabhängige Kennung erstellt werden.');
  }
  if (!local.name?.trim()) throw new Error('Die Klasse hat keine gültige Bezeichnung.');
  // The inaccessible original is never silently replaced by an empty placeholder.
  if (!Array.isArray(local.schueler) || local.schueler.length === 0) {
    throw new Error('Auf diesem Gerät ist keine bestätigte Schülerliste vorhanden. Bitte die lokale Sicherung prüfen, bevor ein neues Klassenteam angelegt wird.');
  }
  const independent = classRoomWithoutTeamMetadata(local);
  return {
    ...independent,
    id: newId,
    name: local.name.trim() + ' – Neustart',
  };
}
