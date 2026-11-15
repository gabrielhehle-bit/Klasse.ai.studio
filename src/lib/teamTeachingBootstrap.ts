import type { AppState, ClassRoom } from '../types';
import { syncActiveClass } from './appState';
import { classRoomFingerprint } from './teamTeachingCrypto';
import { adoptAcknowledgedTeamRoom } from './teamTeachingProjection';
import { pullSharedClass } from './teamTeachingService';

type PulledSharedClass = Awaited<ReturnType<typeof pullSharedClass>>;
export type PullSharedClassForBootstrap = (sharedClassId: string) => Promise<PulledSharedClass>;

/**
 * Hydrate exactly one pointer-only Teamteaching class from the authoritative
 * encrypted team snapshot. Existing hydrated classes are left untouched.
 * Failed/unauthorized pulls keep the local pointer as-is and never invent a
 * revision or sync baseline.
 */
export async function hydrateLinkedTeamClass(
  state: AppState,
  roomId: string,
  pull: PullSharedClassForBootstrap = pullSharedClass,
): Promise<AppState> {
  const current = syncActiveClass(state);
  const localRoom = (current.classes || []).find(room => room.id === roomId);
  if (!localRoom?.teamTeachingSharedClassId || localRoom.teamTeaching) return current;

  const sharedClassId = localRoom.teamTeachingSharedClassId;
  let pulled: PulledSharedClass;
  try {
    pulled = await pull(sharedClassId);
  } catch {
    return current;
  }

  // The account pointer may never hydrate a different class accidentally.
  if (pulled.room.id !== localRoom.id) return current;

  const receivedRoom: ClassRoom = {
    ...pulled.room,
    teamTeachingSharedClassId: sharedClassId,
  };

  return adoptAcknowledgedTeamRoom(current, receivedRoom);
}


/**
 * Apply an asynchronous Teamteaching bootstrap against the CURRENT state,
 * never the state captured before the network request. Reject it when the
 * active class or pointer changed during the request. This preserves unrelated
 * account edits while keeping the team's authoritative class snapshot.
 */
export function applyHydratedTeamClassIfUnchanged(
  previous: AppState,
  roomId: string,
  sharedClassId: string,
  expectedFingerprint: string,
  receivedRoom: ClassRoom,
): AppState {
  if (previous.activeClassId !== roomId) return previous;
  const current = syncActiveClass(previous);
  const currentRoom = current.classes?.find(room => room.id === roomId);
  if (!currentRoom || currentRoom.teamTeaching
    || currentRoom.teamTeachingSharedClassId !== sharedClassId
    || classRoomFingerprint(currentRoom) !== expectedFingerprint
    || receivedRoom.id !== roomId
    || receivedRoom.teamTeaching?.sharedClassId !== sharedClassId) return previous;
  return adoptAcknowledgedTeamRoom(current, receivedRoom);
}
