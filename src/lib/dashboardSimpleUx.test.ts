import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'components', 'DashboardSimpleOverview.tsx'), 'utf8');

test('compact Heute dashboard keeps a single clear daily flow', () => {
  assert.match(source, /aria-label="Heute"/);
  assert.match(source, /aria-label="Heutiger Unterricht"/);
  assert.match(source, /aria-label="Wichtig und offen"/);
  assert.match(source, /aria-label="Schnellzugriff"/);

  assert.equal(source.includes('aria-label="Tagesfokus"'), false);
  assert.equal(source.includes('Vorbereiten</span>'), false);
  assert.equal(source.includes('Unterrichten</span>'), false);
  assert.equal(source.includes('Abschließen</span>'), false);
});

test('compact Heute dashboard exposes only useful quick links', () => {
  assert.match(source, /onNavigate\('wochenplanung'\)/);
  assert.match(source, /onNavigate\('verhalten'\)/);
  assert.match(source, /onNavigate\('orga'\)/);
  assert.match(source, />\s*Wochenplan\s*</);
  assert.match(source, />\s*Notizen\s*</);
  assert.match(source, />\s*Organisation\s*</);
});

test('backup is not promoted on the daily start screen', () => {
  assert.equal(source.includes('onOpenBackup'), false);
  assert.equal(source.includes('Verschlüsseltes Backup herunterladen'), false);
  assert.match(source, /Weitere Übersichten & Widgets/);
});

test('attendance remains visible without being auto-confirmed', () => {
  assert.match(source, /p\.attendanceRequired && !p\.attendanceRecorded/);
  assert.match(source, /Noch nicht geprüft/);
  assert.match(source, /onNavigate\(p\.totalStudents \? 'anwesenheit' : 'schueler'\)/);
});


test('compact Heute dashboard no longer shows privacy toggle or redundant tagline', () => {
  assert.doesNotMatch(source, /Private Angaben verbergen/);
  assert.doesNotMatch(source, /Private Angaben verborgen/);
  assert.doesNotMatch(source, /Das Wichtigste für deinen Schultag/);
});

test('important notices are rendered before attendance inside Offen & im Blick', () => {
  const sectionIndex = source.indexOf('aria-label="Wichtig und offen"');
  const importantIndex = source.indexOf('{tasks.length ? (', sectionIndex);
  const attendanceIndex = source.indexOf('<Users size={15} />', sectionIndex);
  assert.ok(sectionIndex >= 0, 'Wichtig-Sektion fehlt');
  assert.ok(importantIndex >= 0, 'Hinweis-Liste fehlt');
  assert.ok(attendanceIndex > importantIndex, 'Anwesenheit darf wichtige Hinweise nicht überdecken');
  assert.match(source, /item\.category/);
});
