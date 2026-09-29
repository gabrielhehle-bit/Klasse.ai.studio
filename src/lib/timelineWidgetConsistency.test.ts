import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COCKPIT_WIDGET_LIBRARY_ITEMS } from './cockpitWidgetCatalog';

const timeline = readFileSync('src/components/cockpit/widgets/TimelineWidget.tsx', 'utf8');
const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

test('Widget-Neustart beginnt mit dem Tagesablauf als erstem Bibliotheks-Widget', () => {
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS[0]?.type, 'timeline');
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS[0]?.label, '🛤 Tagesablauf');
});

test('Tagesablauf startet in einer kompakten, aber vollständig nutzbaren Größe', () => {
  assert.match(cockpit, /id: "widget-timeline",[\s\S]{0,180}w: 40,[\s\S]{0,80}h: 30/);
  assert.match(frame, /timeline: \{ w: 40, h: 30 \}/);
});

test('Tagesablauf bleibt ohne doppelten Innentitel und mit touch-sicheren Seitenbuttons', () => {
  assert.doesNotMatch(timeline, /<h[1-6][^>]*>\s*Tagesablauf\s*<\/h[1-6]>/);
  assert.match(timeline, /min-h-11 min-w-11 rounded-xl/);
  assert.match(timeline, /aria-label="Vorheriger Tagesabschnitt"/);
  assert.match(timeline, /aria-label="Nächster Tagesabschnitt"/);
  assert.doesNotMatch(timeline, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
});

test('Tagesablauf-Hilfe erklärt Datenquelle, Seiten und Korrekturweg', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');
  assert.match(help, /timeline: \['Öffne im Lehrercockpit „Widget hinzufügen“ → „Tagesablauf“/);
  assert.match(help, /Stundenplan/);
  assert.match(help, /Pfeiltasten/);
  assert.match(help, /keinen eigenen zweiten Tagesplan/);
});

test('Tagesablauf nutzt seine große Ansicht für lesbare Hauptinformation', () => {
  assert.match(timeline, /const roomyTimeline = isFullscreen \|\| \(size\.width >= 820 && size\.height >= 500\)/);
  assert.match(timeline, /roomyTimeline[\s\S]*text-4xl sm:text-5xl/);
  assert.match(timeline, /leading-tight break-words \[overflow-wrap:anywhere\]/);
});
