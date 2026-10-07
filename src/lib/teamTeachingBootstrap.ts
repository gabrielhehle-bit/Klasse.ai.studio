import type { AppState, ClassRoom } from '../types';
import { syncActiveClass, switchClassState } from './appState';
import { adoptAcknowledgedTeamRoom } from './teamTeachingProjection';
import { pullSharedClass } from './teamTeachingService';

type PulledSharedClass = Awaited<ReturnType<typeof pullSharedClass>>;
export type PullSharedClassForBootstrap = (sharedClassId: string) => Promise<PulledSharedClass>;

/**
 * Reconnect classes restored from the encrypted personal-account snapshot to
 * their authoritative Teamteaching snapshot.
 *
 * The personal account intentionally stores only teamTeachingSharedClassId.
 * Device-local revision/hash metadata is established ONLY by a successful pull
 * from the Teamteaching server. No synthetic revision or baseline is created.
 */
export async function hydrateLinkedTeamClasses(
  state: AppState,
  pull: PullSharedClassForBootstrap = pullSharedClass,
): Promise<AppState> {
  const current = syncActiveClass(state);
  const originalActiveId = current.activeClassId;
  const linked = (current.classes || []).filter(room =>
    Boolean(room.teamTeachingSharedClassId) && !room.teamTeaching,
  );
  if (linked.length === 0) return current;

  const hydrated = new Map<string, ClassRoom>();
  for (const localRoom of linked) {
    const sharedClassId = localRoom.teamTeachingSharedClassId;
    if (!sharedClassId) continue;
    try {
      const latest = await pull(sharedClassId);
      // A pointer must never be allowed to replace a different local class.
      if (latest.room.id !== localRoom.id) continue;
      hydrated.set(localRoom.id, {
        ...latest.room,
        teamTeachingSharedClassId: sharedClassId,
      });
    } catch {
      // New device not authorized/offline yet: keep the pointer-only class
      // untouched. A later account refresh or manual Team page can retry.
    }
  }

  if (hydrated.size === 0) return current;

  const classes = (current.classes || []).map(room => hydrated.get(room.id) || room);
  const merged: AppState = { ...current, classes };
  if (!originalActiveId) return merged;

  const activeRoom = classes.find(room => room.id === originalActiveId);
  if (!activeRoom) return merged;

  return activeRoom.teamTeaching
    ? adoptAcknowledgedTeamRoom({ ...merged, activeClassId: undefined }, activeRoom)
    : switchClassState({ ...merged, activeClassId: undefined }, originalActiveId);
}
