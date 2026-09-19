import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');

test('Topbar: Mehr-Menü enthält nur noch zentrale Werkzeuge ohne tote Doppelsteuerungen', () => {
  assert.match(topbar, /Globale Suche/);
  assert.match(topbar, /Handy-Remote/);
  assert.match(topbar, /WLAN QR-Code/);
  assert.match(topbar, /Datentresor sperren/);
  assert.match(topbar, /Bildschirm sofort sperren/);
  assert.match(topbar, /Vollbildmodus/);
  assert.match(topbar, /Datenkonsistenz/);
  assert.doesNotMatch(topbar, /header_simple_mode/);
  assert.doesNotMatch(topbar, /Einfachmodus/);
  assert.doesNotMatch(topbar, /triggerBackupDownload/);
  assert.doesNotMatch(topbar, /JSON-Sicherungsdatei herunterladen/);
});

test('Topbar: Haupteinstellungen und Seitenaktionen bleiben; Dashboard-Anpassung ist nur im Dashboard', () => {
  assert.match(topbar, /setPage\('settings'\)/);
  assert.doesNotMatch(topbar, /setPage\('einstellungen'\)/);
  assert.match(topbar, /\{actions && \(/);
  assert.doesNotMatch(app, /open-dashboard-customize/);
  const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /onOpenCustomize=\{\(\) => setShowCustomizePanel\(true\)\}/);
});

test('Topbar: Abmelden entfernt Session und 30-Tage-Gerätevertrauen ohne Datenlöschung', () => {
  assert.match(topbar, /<span>Abmelden<\/span>/);
  assert.match(topbar, /clearTrustedDeviceUnlock\(\)/);
  assert.match(topbar, /lockAppVault\(\)/);
  assert.match(topbar, /new CustomEvent\('lehrerapp-logout'\)/);
  assert.match(app, /fetch\('\/api\/access\/logout', \{ method: 'POST' \}\)/);
  assert.match(server, /app\.post\("\/api\/access\/logout"/);
  assert.match(server, /klassio_email_account=; Max-Age=0/);
});

test('Topbar: Feedback und Unterstützung erscheinen nicht doppelt außerhalb und innerhalb von Mehr', () => {
  assert.equal((topbar.match(/Fehler melden \(Google Sheet\)/g) || []).length, 1);
  assert.equal((topbar.match(/<span>Klassio unterstützen<\/span>/g) || []).length, 1);
});
