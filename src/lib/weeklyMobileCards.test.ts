import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const mobile = readFileSync('src/components/wochenplan/MobileDayLessonCards.tsx', 'utf8');

test('Kleine Bildschirme öffnen die lesbare Tagesansicht; manuelle Umschaltung bleibt möglich', () => {
  assert.match(weekly, /window\.matchMedia\('\(max-width: 1199px\)'\)\.matches \? 'day' : 'grid'/);
  assert.match(weekly, /onClick=\{\(\) => setViewMode\('grid'\)\}/);
  assert.match(weekly, /onClick=\{\(\) => setViewMode\('day'\)\}/);
  assert.match(weekly, /<MobileDayLessonCards/);
});

test('Tageskarten: Fach, Titel, Stundenzeit und pädagogische Details bleiben sichtbar', () => {
  assert.match(mobile, /data-weekly-day-cards/);
  assert.match(mobile, /data-weekly-day-card/);
  assert.match(mobile, /configuredLessonTime\(/);
  assert.match(mobile, /item\?\.thema/);
  assert.match(mobile, /item\.housework \|\| item\.hue/);
  assert.match(mobile, /item\.halves\?\.enabled/);
  assert.match(mobile, /item\.schwerpunkte/);
  assert.match(mobile, /materialIds/);
  assert.match(mobile, /Für Kinder sichtbar/);
  assert.match(mobile, /getChildTaskProgress\(/);
  assert.match(mobile, /isWeeklyLessonSlotCovered\(/);
});

test('Tageskarten: eigene Tastatur- und Touch-Aktionen statt winziger Hover-Icons', () => {
  assert.match(mobile, /data-weekly-day-actions/);
  assert.match(mobile, /min-h-11/);
  assert.match(mobile, /onOpen\(day, idx\)/);
  assert.match(mobile, /onToggleDone\(event, day, idx\)/);
  assert.match(mobile, /onPark\(day, idx\)/);
  assert.match(mobile, /window\.confirm\(/);
  assert.match(mobile, /aria-label/);
  assert.doesNotMatch(mobile, /opacity-0 group-hover/);
});

test('Tageskarten: keine Direktmutation von Stunden oder Parkgarage', () => {
  assert.doesNotMatch(mobile, /setApp\(/);
  assert.doesNotMatch(mobile, /\.splice\(/);
  assert.doesNotMatch(mobile, /delete\s+dayPlan/);
  assert.match(weekly, /onPark=\{handleParkLesson\}/);
  assert.match(weekly, /onToggleDone=\{toggleDoneStatus\}/);
});
