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
