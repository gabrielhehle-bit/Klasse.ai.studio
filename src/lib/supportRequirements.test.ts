import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createSupporterStore } from '../server/supporterStore';

const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
const modal = readFileSync('src/components/SupportModal.tsx', 'utf8');
const settings = readFileSync('src/components/Settings.tsx', 'utf8');
const settingsHeader = readFileSync('src/components/settings/SettingsHeader.tsx', 'utf8');
const supportSettings = readFileSync('src/components/settings/SupportSettings.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');

test('Support: Herz öffnet zuerst einen Klassio-Dialog statt direkt PayPal', () => {
  assert.match(topbar, /setShowSupportModal\(true\)/);
  assert.match(topbar, /<SupportModal open=\{showSupportModal\}/);
  assert.doesNotMatch(topbar, /href="https:\/\/paypal\.me\/gabrielhehle"[\s\S]{0,500}<Heart/);
  assert.match(modal, /Klassio bleibt frei\. Für alle\./);
  assert.match(modal, /Der Beitrag ist freiwillig/);
});

test('Support: einmalige, monatliche und jährliche PayPal-Optionen sind getrennt konfigurierbar', () => {
  assert.match(server, /KLASSIO_PAYPAL_ONE_TIME_URL/);
  assert.match(server, /KLASSIO_PAYPAL_MONTHLY_URL/);
  assert.match(server, /KLASSIO_PAYPAL_YEARLY_URL/);
  assert.match(modal, /Einmalig unterstützen/);
  assert.match(modal, /Monatlich unterstützen/);
  assert.match(modal, /Jährlich unterstützen/);
  assert.match(modal, /PayPal-Link wird eingerichtet/);
});

test('Support: Einstellungen enthalten freiwillige Unterstützung und Dankesliste', () => {
  assert.match(settingsHeader, /id: 'support'/);
  assert.match(settingsHeader, /Unterstützung/);
  assert.match(settings, /<SupportSettings \/>/);
  assert.match(supportSettings, /Unterstützer:innen/);
  assert.match(supportSettings, /nur mit ausdrücklicher Zustimmung/);
  assert.doesNotMatch(supportSettings, /E-Mail-Adresse/);
  assert.doesNotMatch(supportSettings, /Betrag:/);
});

test('Support: öffentliche API gibt keine Zahlungsdaten aus', () => {
  assert.match(server, /app\.get\('\/api\/support', requireAccess/);
  assert.match(server, /supporterStore\.listPublic\(\)/);
  assert.match(server, /Beträge und Zahlungsdaten werden nicht angezeigt/);
  assert.doesNotMatch(server, /paypalEmail/);
});

test('SupporterStore: speichert nur freigegebene öffentliche Felder', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'klassio-support-'));
  try {
    const store = createSupporterStore(dir);
    await store.replacePublic([
      { displayName: '  Anna   Test  ', cadence: 'monthly', since: '2026-09-01', email: 'secret@example.com', amount: 99 },
      { displayName: 'Max', cadence: 'invalid', since: 'not-a-date' },
    ] as any);

    assert.deepEqual(await store.listPublic(), [
      { displayName: 'Anna Test', cadence: 'monthly', since: '2026-09-01' },
      { displayName: 'Max', cadence: undefined, since: undefined },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
