import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Sidebar zeigt vorhandene Vornamen oder hinterlegten Lehrkraftnamen statt blind Name fehlt', () => {
  const source = readFileSync('src/components/Sidebar.tsx', 'utf8');
  assert.match(source, /getTeacherFirstName\(app\)/);
  assert.match(source, /app\?\.lehrerName/);
  assert.match(source, /app\?\.nachname\?\.trim\(\)/);
  assert.match(source, /teacherDisplayName \|\| 'KLASSIO'/);
  assert.doesNotMatch(source, /app\.nachname \? [^\n]*: 'Name fehlt'/);
});

test('Das redundante Aktiv-Lehrkraft-Feld am Fuß der Seitenleiste ist entfernt', () => {
  const source = readFileSync('src/components/Sidebar.tsx', 'utf8');
  assert.doesNotMatch(source, /<div className="text-\[0\.6875rem\][^>]*>Aktiv<\/div>/);
  assert.doesNotMatch(source, /\{app\.vorname \|\| 'Lehrkraft'\}/);
});

test('PayPal-Herz zeigt öffentliche Wall of Fame mit Zustimmung statt erfundener Namen', () => {
  const topbar = readFileSync('src/components/Topbar.tsx', 'utf8');
  const modal = readFileSync('src/components/SupportModal.tsx', 'utf8');
  assert.match(topbar, /<SupportModal open=\{showSupportModal\}/);
  assert.match(modal, /Wall of Fame · Danke euch!/);
  assert.match(modal, /info\.supporters\.map/);
  assert.match(modal, /\{supporter\.displayName\}/);
  assert.match(modal, /Namen erscheinen erst nach ausdrücklicher Zustimmung/);
  assert.match(modal, /\{info\.privacy\}/);
  assert.match(modal, /max-h-\[90dvh\] overflow-y-auto/);
  assert.doesNotMatch(modal, /supporter\.email|supporter\.amount/);
});
