import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');
const account = readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');
const antolin = readFileSync('src/components/AntolinImportModal.tsx', 'utf8');
const ikm = readFileSync('src/components/DiagnostikLegacy.tsx', 'utf8');

test('security release keeps direct student report AI uploads disabled at UI and server', () => {
  assert.match(server, /app\.post\("\/api\/ai\/analyze-ikm", async \(req, res\) => \{\s*return res\.status\(403\)/);
  assert.match(server, /app\.post\("\/api\/ai\/analyze-antolin", async \(req, res\) => \{\s*return res\.status\(403\)/);
  assert.match(antolin, /disabled=\{loading \|\| AI_STUDENT_REPORTS_DISABLED\}/);
  assert.match(ikm, /!STUDENT_REPORT_AI_DISABLED && !aiImportPreview/);
});

test('account-wide session invalidation is discoverable but does not claim remote vault deletion', () => {
  assert.match(server, /app\.post\('\/api\/access\/logout-all', requireEmailAccount/);
  assert.match(account, /Alle Geräte abmelden/);
  assert.match(account, /Bereits entsperrte Apps auf anderen Geräten können lokal weiterhin offen sein/);
  assert.match(account, /clearActiveVaultSession\(\)/);
});
