import React from 'react';
import { ensureRegisteredTeamTeachingDevice, getSharedClassDetail } from '../lib/teamTeachingService';

export type TeamDeviceAuthorization = 'unknown' | 'checking' | 'authorized' | 'unauthorized';

export function useTeamDeviceAuthorization(sharedClassId?: string): TeamDeviceAuthorization {
  const [state, setState] = React.useState<TeamDeviceAuthorization>(sharedClassId ? 'checking' : 'unknown');

  React.useEffect(() => {
    let cancelled = false;
    if (!sharedClassId) {
      setState('unknown');
      return () => { cancelled = true; };
    }

    setState('checking');
    void (async () => {
      try {
        const { device } = await ensureRegisteredTeamTeachingDevice();
        const detail = await getSharedClassDetail(sharedClassId);
        if (!cancelled) setState(detail.wrappedKeys?.[device.deviceId] ? 'authorized' : 'unauthorized');
      } catch {
        // Authentication/connectivity errors are represented by the regular
        // sync state. Do not mislabel them as a missing device approval.
        if (!cancelled) setState('unknown');
      }
    })();

    return () => { cancelled = true; };
  }, [sharedClassId]);

  return state;
}
