import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getQuietSyncBadge } from './quietSyncBadge';

test('ordinary auto-save transitions do not flicker or change badge width/color', () => {
  const stages = ['saving-local','saved-local','syncing','synced'] as const;
  const badges = stages.map(status => getQuietSyncBadge(status, true));
  assert.deepEqual(new Set(badges.map(item => item?.text)), new Set(['Autospeichern']));
  assert.equal(new Set(badges.map(item => item?.color)).size, 1);
  assert.notEqual(badges[0]?.description, badges[3]?.description);
  assert.match(badges[1]!.description, /noch nicht bestätigt/);
  assert.match(badges[3]!.description, /Server bestätigt/);
});

test('offline, unsafe local storage, sync conflicts and errors stay immediately visible', () => {
  for (const stage of ['saving-local','saved-local','syncing','synced'] as const) {
    assert.equal(getQuietSyncBadge(stage, false)?.text, 'Offline · lokal');
  }
  assert.equal(getQuietSyncBadge('local-error', false)?.text, 'Nicht gespeichert!');
  assert.equal(getQuietSyncBadge('conflict', true)?.text, 'Sync-Konflikt');
  assert.equal(getQuietSyncBadge('error', true)?.text, 'Speichern prüfen');
  assert.equal(getQuietSyncBadge('idle', true), null);
  assert.equal(getQuietSyncBadge('disabled', true), null);
});

test('Topbar uses quiet badge; encrypted local and account sync timers stay unchanged', () => {
  const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(topbar, /getQuietSyncBadge\(accountSyncStatus, isOnline\)/);
  assert.match(topbar, /cloudSaveBadge\.description/);
  assert.match(context, /\}, 150\);/);
  assert.match(context, /pushAccountStateIfReady\(snapshot, vaultKey\)/);
  assert.match(context, /\}, 15_000\);/);
  assert.match(context, /accountSyncStatusRef\.current !== 'synced'/);
});
