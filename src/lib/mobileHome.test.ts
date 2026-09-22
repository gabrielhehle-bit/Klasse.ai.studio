import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// UI regression: the phone launcher is strictly a device-local navigation
// shell over the existing encrypted app state. No pupil fixtures are needed.
test('Mobile launcher exposes the five requested tools plus cockpit remote', () => {
  const home = readFileSync('src/components/MobileHome.tsx', 'utf8');
  for (const destination of ['dashboard', 'schueler', 'anwesenheit', 'verhalten', 'wochenplanung']) {
    assert.ok(home.includes(`id: '${destination}'`), `Missing mobile shortcut ${destination}`);
  }
  assert.match(home, /Lehrercockpit Remote/);
  assert.match(home, /Fernbedienung verbinden/);
  assert.match(home, /Kopplungs-QR-Code/);
  assert.ok(!home.includes('createVault('), 'A mobile launcher must never make a second vault.');
  assert.ok(!home.includes('addClass('), 'A mobile launcher must never create a second class.');
});

test('Mobile remote requires the existing live-session key and does not change PC layout', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const home = readFileSync('src/components/MobileHome.tsx', 'utf8');
  const accountSync = readFileSync('src/lib/accountSyncService.ts', 'utf8');
  assert.match(app, /\(max-width: 767px\) and \(pointer: coarse\)/);
  assert.match(app, /mobileDevice && mobileHomeVisible/);
  assert.ok(!home.includes('remoteReady'), 'A local smartboard host session is not a paired phone remote.');
  assert.ok(!app.includes('onOpenRemote={() =>'), 'The phone must join an explicit QR session before remote activation.');
  assert.match(app, /isRemoteController\) \{/);
  const workspace = readFileSync('src/components/MobileWorkspace.tsx', 'utf8');
  assert.match(workspace, /Zur KLASSIO-Mobile-Startseite/);
  assert.match(workspace, /data-testid="klassio-mobile-workspace"/);
  assert.match(workspace, /Mobile Navigation/);
  assert.ok(!workspace.includes('Autospeichern'), 'The wide PC status toolbar must not appear on mobile.');
  assert.match(accountSync, /activeSyncCode: undefined,/);
  assert.match(accountSync, /isRemoteController: undefined,/);
});
