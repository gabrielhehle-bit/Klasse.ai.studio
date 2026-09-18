import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AiUsageStore } from '../server/aiUsageStore';

test('AI usage store enforces per-user and global daily limits persistently', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-ai-usage-'));
  try {
    const store = new AiUsageStore(dir);
    const now = new Date('2026-09-18T10:00:00+02:00');

    const a1 = await store.consume('account-a', 2, 3, now);
    assert.equal(a1.allowed, true);
    assert.equal(a1.used, 1);
    assert.equal(a1.remaining, 1);

    const a2 = await store.consume('account-a', 2, 3, now);
    assert.equal(a2.allowed, true, 'the final request inside the quota must still run');
    assert.equal(a2.used, 2);
    assert.equal(a2.remaining, 0);

    const a3 = await store.consume('account-a', 2, 3, now);
    assert.equal(a3.allowed, false);
    assert.equal(a3.reason, 'user');

    const b1 = await store.consume('account-b', 2, 3, now);
    assert.equal(b1.allowed, true);
    assert.equal(b1.globalUsed, 3);
    assert.equal(b1.globalRemaining, 0);

    const b2 = await store.consume('account-b', 2, 3, now);
    assert.equal(b2.allowed, false);
    assert.equal(b2.reason, 'global');

    const restarted = new AiUsageStore(dir);
    const persisted = await restarted.get('account-a', 2, 3, now);
    assert.equal(persisted.used, 2);
    assert.equal(persisted.remaining, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('AI usage store resets on the next Vienna calendar day', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'klassio-ai-usage-day-'));
  try {
    const store = new AiUsageStore(dir);
    await store.consume('account-a', 2, 10, new Date('2026-09-18T20:00:00Z'));
    const nextDay = await store.get('account-a', 2, 10, new Date('2026-09-19T06:00:00Z'));
    assert.equal(nextDay.used, 0);
    assert.equal(nextDay.remaining, 2);
    assert.equal(nextDay.allowed, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
