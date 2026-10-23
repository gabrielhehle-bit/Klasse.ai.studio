import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const today = readFileSync('src/components/DashboardSimpleOverview.tsx', 'utf8');

test('Calm Heute facelift preserves familiar position and naming of daily areas', () => {
  const labels = ['aria-label="Heute"', 'aria-label="Heutiger Unterricht"', 'aria-label="Wichtig und offen"', 'aria-label="Schnellzugriff"'];
  const positions = labels.map(label => today.indexOf(label));
  assert.ok(positions.every(index => index >= 0), 'All four original areas remain');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const text of ['Dein Unterricht', 'Heute wichtig', 'Meine offenen Aufgaben', 'Anwesenheit ·', 'Wochenplan', 'Notizen', 'Organisation', 'Weitere Übersichten & Widgets']) {
    assert.ok(today.includes(text), 'Missing familiar action: ' + text);
  }
});

test('No business, data, privacy or navigation actions changed by the facade', () => {
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\('profil'\)\}/);
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\(primaryTarget\)\}/);
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\('wochenplanung'\)\}/);
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\('verhalten'\)\}/);
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\('orga'\)\}/);
  assert.match(today, /onClick=\{p\.onSimpleModeToggle\}/);
  assert.match(today, /p\.attendanceRequired && !p\.attendanceRecorded/);
  assert.match(today, /p\.privacyMode \? 'Privater Eintrag/);
  assert.doesNotMatch(today, /\bsetApp\(|\bfetch\(|\blocalStorage\.|\bpushSharedClass\(/);
});

test('No generic AI-dashboard gradient, card shadow or new decorative animation on compact Today', () => {
  assert.doesNotMatch(today, /bg-gradient-to-|shadow-xl|animate-pulse/);
  assert.match(today, /bg-\[var\(--surface\)\]/);
  assert.match(today, /border-\[var\(--border\)\]/);
  assert.match(today, /focus-visible:outline/);
});
