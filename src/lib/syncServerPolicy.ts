export function getServerSyncTimestamps(
  payloadUpdatedAt: unknown,
  now = Date.now(),
): { lastUpdated: number; lastActivityAt: number } {
  return {
    lastUpdated: typeof payloadUpdatedAt === 'number' && Number.isFinite(payloadUpdatedAt)
      ? payloadUpdatedAt
      : now,
    lastActivityAt: now,
  };
}

export function isSyncSessionExpired(
  lastActivityAt: number,
  now: number,
  maxInactivityMs: number,
): boolean {
  return now - lastActivityAt > maxInactivityMs;
}
