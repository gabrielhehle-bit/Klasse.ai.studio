export type AccountLiveStatus = 'disabled' | 'connecting' | 'live' | 'reconnecting' | 'offline';

/** An event is only a hint; the existing encrypted reconciliation decides whether
 * it can be applied. Never deserialize pupil data or mark a save confirmed here. */
export function parseAccountLiveRevision(data: string): number | null {
  try {
    const revision = JSON.parse(data)?.revision;
    return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
  } catch { return null; }
}

export function needsAccountLiveRefresh(pending: number, confirmed: number): boolean {
  return Number.isSafeInteger(pending) && pending > confirmed;
}
