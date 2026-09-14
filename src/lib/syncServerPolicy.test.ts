import test from 'node:test';
import assert from 'node:assert/strict';
import { getServerSyncTimestamps, isSyncSessionExpired } from './syncServerPolicy';

test('sync expiry uses server activity time, not a client supplied future timestamp', () => {
  const now = 1_000_000;
  const timing = getServerSyncTimestamps(now + 10_000_000, now);
  assert.equal(timing.lastUpdated, now + 10_000_000);
  assert.equal(timing.lastActivityAt, now);
  assert.equal(isSyncSessionExpired(timing.lastActivityAt, now + 7_200_001, 7_200_000), true);
});

test('invalid client timestamps fall back to server time', () => {
  assert.deepEqual(getServerSyncTimestamps(Number.NaN, 1234), {
    lastUpdated: 1234,
    lastActivityAt: 1234,
  });
});
