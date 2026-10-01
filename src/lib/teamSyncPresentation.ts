import type { ClassRoom } from '../types';
import { classRoomFingerprint } from './teamTeachingCrypto';

/** A previous acknowledgement is not confirmation of edits made afterwards. */
export function teamSyncPresentation(room?: ClassRoom) {
  if (!room || (!room.teamTeaching && !room.teamTeachingSharedClassId)) return undefined;
  const meta = room.teamTeaching;
  const status: 'synced' | 'conflict' | 'error' | 'pending' = meta?.syncStatus === 'conflict' ? 'conflict'
    : meta?.syncStatus === 'error' ? 'error'
    : meta?.syncStatus === 'synced' && !!meta.lastSyncedHash && classRoomFingerprint(room) === meta.lastSyncedHash ? 'synced'
    : 'pending';
  return {
    status,
    label: status === 'synced' ? 'Team synchronisiert' : status === 'conflict' ? 'Team-Konflikt' : status === 'error' ? 'Team-Sync prüfen' : 'Team-Änderung ausstehend',
    editor: meta?.lastChangedBy || 'Noch nicht bestätigt',
    changedAt: meta?.lastChangedAt,
    syncedAt: meta?.lastSyncedAt,
  };
}
