import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/components/ClassTeam.tsx', 'utf8');
const help = readFileSync('src/components/TeamTeachingQuickHelp.tsx', 'utf8');

test('Simple help lives inside the existing class team page, not a separate site', () => {
  assert.match(page, /import TeamTeachingQuickHelp from '\.\/TeamTeachingQuickHelp'/);
  assert.match(page, /data-testid="team-two-teachers-help"/);
  assert.match(page, /<TeamTeachingQuickHelp/);
  assert.match(page, /sharedClassId=\{activeSharedId\}/);
  assert.match(page, /serverConfirmed=\{Boolean\(activeSummary\)\}/);
  assert.match(page, /deviceAuthorization=\{deviceAuthorization\}/);
  assert.match(page, /teamSyncStatus=\{teamSyncStatus\}/);
});

test('Teachers use different school accounts but join exactly one existing shared class', () => {
  assert.match(help, /zwei eigene Schul-E-Mail-Adressen/);
  assert.match(help, /eine gemeinsame Klasse/);
  assert.match(help, /Keine zweite Klasse erstellen/);
  assert.match(help, /Mit mir geteilte Klassen/);
  assert.match(help, /Gerätefreigabe/);
  assert.match(help, /Team-Kurzcode/);
});

test('The guided check confirms both directions before claiming a manual success', () => {
  assert.match(help, /canTest = Boolean\(/);
  assert.match(help, /serverConfirmed && deviceAuthorization === 'authorized'/);
  assert.match(help, /teamSyncStatus === 'synced'/);
  assert.match(help, /choose\(canTest \? 'from-a' : 'connection'\)/);
  assert.match(help, /TEAMTEST A/);
  assert.match(help, /TEAMTEST B/);
  assert.match(help, /choose\('from-b'\)/);
  assert.match(help, /choose\('success'\)/);
  assert.match(help, /Ihr habt selbst bestätigt/);
  assert.match(help, /Test von vorne beginnen/);
});

test('Help checks without writing or sending sensitive classroom content', () => {
  assert.doesNotMatch(help, /pushSharedClass|createSharedClass|setApp\(|fetch\(|localStorage|window\.confirm/);
  assert.match(help, /keine Schülerdaten/);
  assert.match(help, /nichts löschen/);
  assert.match(help, /nichts überschreiben/);
  assert.match(help, /data-testid="team-help-guided-test"/);
  assert.match(help, /aria-live="polite"/);
  assert.match(help, /KLASSIO Teamtest – Angaben von diesem Gerät/);
});
