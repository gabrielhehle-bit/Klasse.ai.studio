import type { AppState, ClassRoom } from '../types';
import { syncActiveClass, switchClassState } from './appState';
import { classRoomFingerprint } from './teamTeachingCrypto';

/**
 * A new team member's personal root state contains unrelated defaults.
 * Switching into a shared class reprojects its fields and may normalize the
 * original encrypted snapshot. This is NOT a teacher edit and must NOT trigger
 * an automatic upload that can race another teacher's real lesson changes.
 *
 * Only call when adopting an already-acknowledged REMOTE snapshot (or after
 * creating the very first shared snapshot), never for unsent local work.
 */
export function adoptAcknowledgedTeamRoom(state: AppState, receivedRoom: ClassRoom): AppState {
  const current = syncActiveClass(state);
  const classes = [...(current.classes || [])];
  const index = classes.findIndex(room => room.id === receivedRoom.id);
  if (index >= 0) classes[index] = receivedRoom;
  else classes.push(receivedRoom);

  // The shared-class pointer follows the teacher's encrypted E-Mail account
  // to their other devices; revision, role and keys remain strictly device-local.
  if (receivedRoom.teamTeaching) {
    const linkedIndex = classes.findIndex(room => room.id === receivedRoom.id);
    classes[linkedIndex] = { ...classes[linkedIndex], teamTeachingSharedClassId: receivedRoom.teamTeaching.sharedClassId };
  }
  const projected = syncActiveClass(
    switchClassState({ ...current, classes, activeClassId: undefined }, receivedRoom.id),
  );
  if (!receivedRoom.teamTeaching) return projected;
  const activeRoom = projected.classes.find(room => room.id === receivedRoom.id);
  if (!activeRoom) return projected;
  const localProjectionHash = classRoomFingerprint(activeRoom);
  return {
    ...projected,
    classes: projected.classes.map(room => room.id !== receivedRoom.id ? room : {
      ...room,
      teamTeaching: {
        ...room.teamTeaching!,
        lastSyncedHash: localProjectionHash,
        syncStatus: 'synced' as const,
        syncMessage: undefined,
      },
    }),
  };
}

/** Adopt the remote baseline and keep the merged result pending until its write is acknowledged. */
export function stageMergedTeamRoom(state: AppState, remote: ClassRoom, merged: ClassRoom): AppState {
  const acknowledged = adoptAcknowledgedTeamRoom(state, remote);
  const meta = acknowledged.classes.find(room => room.id === remote.id)?.teamTeaching;
  if (!meta) return acknowledged;
  const staged = adoptAcknowledgedTeamRoom(
    { ...acknowledged, activeClassId: undefined }, { ...merged, teamTeaching: meta },
  );
  return {
    ...staged,
    classes: staged.classes.map(room => room.id !== remote.id || !room.teamTeaching
      || room.teamTeaching.lastSyncedHash === meta.lastSyncedHash ? room : {
      ...room,
      teamTeaching: { ...meta, syncStatus: 'idle' },
    }),
  };
}

/**
 * A previously conflicting device can accept the authoritative server receipt
 * without discarding local work when the encrypted class CONTENT already matches.
 * A server rollback must still be treated as an error.
 */
export function shouldAcknowledgeMatchingTeamSnapshot(
  localHash: string,
  remoteHash: string,
  localRevision: number,
  remoteRevision: number,
  syncStatus: string | undefined,
  hasBaseline: boolean,
): boolean {
  return localHash === remoteHash
    && remoteRevision >= localRevision
    && (!hasBaseline || remoteRevision > localRevision
      || syncStatus === 'conflict' || syncStatus === 'error');
}
