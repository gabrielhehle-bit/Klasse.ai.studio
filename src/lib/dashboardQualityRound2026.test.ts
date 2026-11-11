import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const today = readFileSync('src/components/DashboardSimpleOverview.tsx', 'utf8');

test('Heute redesign retains the established lesson / task / attendance / quick-links flow', () => {
  const labels = ['aria-label="Heute"', 'aria-label="Heutiger Unterricht"', 'aria-label="Wichtig und offen"', 'aria-label="Schnellzugriff"'];
  const positions = labels.map(label => today.indexOf(label));
  assert.ok(positions.every(index => index >= 0), 'Every established region remains present');
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  for (const label of ['Dein Unterricht', 'Heute wichtig', 'Meine offenen Aufgaben', 'Anwesenheit ·', 'Wochenplan', 'Notizen', 'Organisation', 'Weitere Übersichten & Widgets']) {
    assert.ok(today.includes(label), 'Missing familiar content or action: ' + label);
  }
});

test('daily navigation, attendance and privacy remain unchanged without state writes', () => {
  assert.match(today, /p\.totalStudents === 0/);
  assert.match(today, /p\.attendanceRequired && !p\.attendanceRecorded/);
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\(primaryTarget\)\}/);
  for (const target of ['profil', 'wochenplanung', 'verhalten', 'orga']) {
    assert.ok(today.includes(`p.onNavigate('${target}')`), 'Missing navigation target: ' + target);
  }
  assert.match(today, /onClick=\{p\.onSimpleModeToggle\}/);
  assert.match(today, /p\.privacyMode \? 'Privater Eintrag/);
  assert.doesNotMatch(today, /\bsetApp\s*\(|\bfetch\s*\(|\blocalStorage\.|\bpushSharedClass\s*\(/);
});

test('Heute uses calm KLASSIO theme tokens rather than decorative gradients', () => {
  assert.match(today, /data-dashboard-quality-round="1"/);
  assert.doesNotMatch(today, /bg-gradient-to-|shadow-xl|animate-pulse/);
  assert.match(today, /border-\[var\(--border\)\]/);
  assert.match(today, /bg-\[var\(--surface\)\]/);
  assert.match(today, /bg-\[var\(--surface2\)\]/);
});

test('time column is readable on narrow screens, primary actions remain touch-sized', () => {
  assert.match(today, /grid-cols-\[4\.5rem_minmax\(0,1fr\)\]/);
  assert.match(today, /sm:grid-cols-\[6rem_minmax\(0,1fr\)\]/);
  assert.match(today, /min-h-11 w-full items-center justify-center/);
  assert.match(today, /aria-expanded=\{showAllTasks\}/);
  assert.match(today, /disabled=\{isPreview\}/);
  assert.match(today, /focus-visible:outline/);
});

test('screenshot review: avoids duplicated attendance call to action', () => {
  assert.match(today, /primaryTarget === 'anwesenheit' && !isPreview/);
  assert.match(today, /data-dashboard-attendance-status role="status"/);
  assert.match(today, /Anwesenheit \$\{dayLabel\}: \$\{attendanceValue\}/);
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\(p\.totalStudents \? 'anwesenheit' : 'schueler'\)\}/);
});

test('screenshot review: condenses actions, keeps widget and quick-link navigation', () => {
  assert.match(today, /data-dashboard-quick-actions/);
  assert.match(today, /aria-label="Schnellzugriff"/);
  assert.match(today, /onClick=\{p\.onSimpleModeToggle\}/);
  for (const path of ['wochenplanung', 'verhalten', 'orga']) {
    assert.ok(today.includes(`p.onNavigate('${path}')`));
  }
  assert.doesNotMatch(today, /<footer className="flex justify-center">/);
});

test('screenshot review: mobile profile remains, desktop avoids duplicate sidebar avatar', () => {
  assert.match(today, /onClick=\{\(\) => p\.onNavigate\('profil'\)\}/);
  assert.match(today, /focus-visible:ring-\[var\(--accent\)\] lg:hidden/);
  assert.match(today, /\{p\.klasseLabel \|\| 'Deine Klasse'\}/);
  assert.match(today, /lg:sr-only/);
});
