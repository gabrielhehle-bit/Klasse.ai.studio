import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
const simple = readFileSync('src/components/DashboardSimpleOverview.tsx', 'utf8');

test('Dashboard priorisiert Geburtstage der laufenden Woche', () => {
  assert.match(dashboard, /Geburtstage bis Sonntag stehen immer ganz oben/);
  assert.match(dashboard, /bday-week-/);
  assert.match(dashboard, /Geburtstag von/);
  const birthdayIndex = dashboard.indexOf('bday-week-');
  const todoIndex = dashboard.indexOf('todo-${todo.id}');
  assert.ok(birthdayIndex >= 0 && todoIndex > birthdayIndex);
});

test('Dashboard übernimmt wichtige Wochenplan-Termine in Offen & im Blick', () => {
  for (const type of ['test', 'schularbeit', 'sa', 'lzk', 'ausflug', 'event', 'spielefest', 'konferenz', 'gespraech', 'sonstiges']) {
    assert.ok(dashboard.includes(`"${type}"`), `Termin-Typ fehlt: ${type}`);
  }
  assert.match(dashboard, /dayPlan\.zeitunabhaengig/);
  assert.match(dashboard, /linkPage: "wochenplanung"/);
});

test('Persönliche To-Dos werden direkt als wichtige Hinweise mit Notizen-Link gezeigt', () => {
  assert.match(dashboard, /app\?\.dashboardTodos/);
  assert.match(dashboard, /category: "To-Do"/);
  assert.match(dashboard, /linkPage: "verhalten"/);
  assert.match(simple, /Offen & im Blick/);
});

test('Dashboard-Privatmodus ist aus der Startseite entfernt', () => {
  assert.doesNotMatch(dashboard, /dashboard_privacy_mode_v1/);
  assert.match(dashboard, /privacyMode=\{false\}/);
  assert.doesNotMatch(simple, /Private Angaben verbergen/);
});
