import React from 'react';
import {
  clearTeamTeachingKeyCache,
  ensureRegisteredTeamTeachingDevice,
  getSharedClassDetail,
  getTeamTeachingMe,
  listTeamTeachingSchoolUsers,
  refreshTeamTeachingMemberDevices,
} from '../lib/teamTeachingService';

export type TeamDeviceAuthorization = 'unknown' | 'checking' | 'authorized' | 'unauthorized';

const UNAUTHORIZED_RECHECK_MS = 5_000;
const AUTHORIZED_RECHECK_MS = 12_000;
const propagatedDeviceSignatures = new Map<string, string>();
let observedUserId: string | null = null;

async function ensureCurrentTeamTeachingSession() {
  const current = await getTeamTeachingMe();
  if (observedUserId && observedUserId !== current.user.userId) {
    clearTeamTeachingKeyCache();
    propagatedDeviceSignatures.clear();
  }
  observedUserId = current.user.userId;

  let session = await ensureRegisteredTeamTeachingDevice();
  if (session.me.user.userId !== current.user.userId || session.me.school.id !== current.school.id) {
    clearTeamTeachingKeyCache();
    propagatedDeviceSignatures.clear();
    session = await ensureRegisteredTeamTeachingDevice();
  }
  return session;
}

async function propagateRegisteredDevices(
  sharedClassId: string,
  currentUserId: string,
  detail: Awaited<ReturnType<typeof getSharedClassDetail>>,
): Promise<void> {
  const schoolUsers = await listTeamTeachingSchoolUsers();
  const memberIds = new Set(detail.members.map(member => member.userId));
  const targets = schoolUsers.filter(user => {
    if (!user.devices.length) return false;
    return detail.myRole === 'owner'
      ? memberIds.has(user.userId)
      : user.userId === currentUserId;
  });

  const signature = targets
    .map(user => `${user.userId}:${user.devices.map(device => device.deviceId).sort().join(',')}`)
    .sort()
    .join('|');
  const cacheKey = `${sharedClassId}:${currentUserId}:${detail.myRole}`;
  if (propagatedDeviceSignatures.get(cacheKey) === signature) return;

  await Promise.all(targets.map(target => refreshTeamTeachingMemberDevices(sharedClassId, target)));
  propagatedDeviceSignatures.set(cacheKey, signature);
}

export function useTeamDeviceAuthorization(sharedClassId?: string): TeamDeviceAuthorization {
  const [state, setState] = React.useState<TeamDeviceAuthorization>(sharedClassId ? 'checking' : 'unknown');

  React.useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const schedule = (delay: number) => {
      if (!cancelled) timer = window.setTimeout(check, delay);
    };

    const check = async () => {
      try {
        const { me, device } = await ensureCurrentTeamTeachingSession();
        const detail = await getSharedClassDetail(sharedClassId!);
        const authorized = Boolean(detail.wrappedKeys?.[device.deviceId]);
        if (!cancelled) setState(authorized ? 'authorized' : 'unauthorized');

        if (authorized) {
          // A device that can already decrypt the class acts as the secure bridge:
          // owners authorize every registered team device, other teachers all of
          // their own registered devices. The class key itself never reaches the server.
          await propagateRegisteredDevices(sharedClassId!, me.user.userId, detail).catch(() => undefined);
          schedule(AUTHORIZED_RECHECK_MS);
        } else {
          // The newly registered device keeps checking in the background. As soon
          // as an authorized team session has propagated its key, it unlocks here
          // without requiring the teacher to open the team settings manually.
          schedule(UNAUTHORIZED_RECHECK_MS);
        }
      } catch {
        // Authentication/connectivity errors are represented by the regular
        // sync state. Do not mislabel them as a missing device approval.
        if (!cancelled) setState('unknown');
        schedule(AUTHORIZED_RECHECK_MS);
      }
    };

    if (!sharedClassId) {
      setState('unknown');
      return () => { cancelled = true; };
    }

    setState('checking');
    void check();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [sharedClassId]);

  return state;
}
