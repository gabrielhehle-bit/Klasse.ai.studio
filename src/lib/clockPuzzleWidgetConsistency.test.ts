import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const ClockpuzzleWidgetContent');
const end = source.indexOf('// 23. WIDGET: BRUCHTEILE-MALER', start);
const widget = source.slice(start, end);

test('Uhren-Lern-Trainer bietet Ablesen und echtes Einstellen', () => {
  assert.match(widget, /type Mode = 'read' \| 'set'/);
  assert.match(widget, /Uhr ablesen/);
  assert.match(widget, /Uhr einstellen/);
  assert.match(widget, /changeStudentHour/);
  assert.match(widget, /changeStudentMinute/);
  assert.match(widget, /checkSetAnswer/);
});

test('Uhren-Lern-Trainer staffelt Uhrzeiten didaktisch', () => {
  assert.match(widget, /type Level = 'hour' \| 'half' \| 'quarter'/);
  assert.match(widget, /Volle Stunden/);
  assert.match(widget, /Halbe Stunden/);
  assert.match(widget, /Viertelstunden/);
});

test('Uhren-Lern-Trainer zeichnet Minutenstriche und korrekt wandernden Stundenzeiger', () => {
  assert.match(widget, /Array\.from\(\{ length: 60 \}/);
  assert.match(widget, /displayClock\.m \* 0\.5/);
  assert.match(widget, /displayClock\.m \* 6/);
});

test('Uhren-Lern-Trainer entfernt Punkte-Gamification und automatische Timeout-Wechsel', () => {
  assert.doesNotMatch(widget, /score|Punkte:/i);
  assert.doesNotMatch(widget, /setTimeout\(\(\) => rollNewTime/);
  assert.match(widget, /Neue Uhrzeit/);
});

test('Uhren-Lern-Trainer nutzt große Touchflächen, KLASSIO-Akzent und kein eigenes Scrollen', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-14 rounded-xl/);
  assert.match(widget, /min-h-11 rounded-xl bg-accent/);
  assert.match(widget, /bg-accent text-accent-text/);
});

test('Uhren-Lern-Trainer hat keinen doppelten Innentitel und kündigt Feedback an', () => {
  assert.doesNotMatch(widget, />\s*⏰ Uhren-Lern-Trainer\s*</);
  assert.match(widget, /aria-live="polite"/);
  assert.match(widget, /Der lange Zeiger zeigt die Minuten/);
});


test('Uhren-Lern-Trainer erklärt Zeiger visuell und gibt differenziertes Feedback', () => {
  assert.match(widget, /Zeiger-Legende/);
  assert.match(widget, /Minutenzeiger/);
  assert.match(widget, /Stundenzeiger/);
  assert.match(widget, /Der Minutenzeiger passt noch nicht/);
  assert.match(widget, /Die Minuten stimmen\. Prüfe jetzt den kurzen dunklen Stundenzeiger/);
});

test('Uhren-Lern-Trainer benennt Einstellaktionen für Screenreader eindeutig', () => {
  assert.match(widget, /aria-label="Stundenzeiger zurück"/);
  assert.match(widget, /aria-label="Stundenzeiger vor"/);
  assert.match(widget, /aria-label="Minutenzeiger zurück"/);
  assert.match(widget, /aria-label="Minutenzeiger vor"/);
});
