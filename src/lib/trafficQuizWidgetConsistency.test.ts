import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Fahrradtrainer ist als österreichische Version im Cockpit verdrahtet', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /TrafficQuizWidgetContent/);
  assert.match(cockpit, /case "trafficquiz":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(cockpit, /w\.type === "trafficquiz" && updates\.settings/);
  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"trafficquiz",/);
  assert.match(catalog, /Österreichische Verkehrszeichen & Radfahrregeln/);
  assert.match(widget, /trafficquiz: \{ w: 48, h: 58 \}/);
});

test('Fahrradtrainer hat große Smartboard-Bedienung ohne Mini-UI', () => {
  const source = readFileSync('src/components/cockpit/TrafficQuizWidgetContent.tsx', 'utf8');

  assert.match(source, /min-h-11/);
  assert.match(source, /min-h-12/);
  assert.match(source, /bg-accent/);
  assert.doesNotMatch(source, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce)/);
  assert.doesNotMatch(source, /GEPRÜFTER RADFAHRER|FAHRRAD-FÜHRERSCHEIN ★/);
});

test('Fahrradtrainer bezeichnet Ergebnis ausdrücklich nur als Übungsprüfung', () => {
  const source = readFileSync('src/components/cockpit/TrafficQuizWidgetContent.tsx', 'utf8');

  assert.match(source, /Übungsprüfung bestanden/);
  assert.match(source, /kein amtlicher Nachweis/);
  assert.match(source, /Rechtsstand September 2026/);
});

test('alte fachlich falsche Legacy-Komponente wurde entfernt', () => {
  const legacy = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

  assert.doesNotMatch(legacy, /export const TrafficquizWidgetContent/);
  assert.doesNotMatch(legacy, /Vorfahrtsstraße/);
  assert.doesNotMatch(legacy, /Fahrzeuge, die im Kreisverkehr fahren, haben Vorfahrt/);
  assert.doesNotMatch(legacy, /STOPP<\/text>/);
});

test('Fahrradtrainer-Hilfe nennt Österreich, Themenfilter und Übungsprüfung', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');

  assert.match(help, /trafficquiz: \['Öffne im Lehrercockpit/);
  assert.match(help, /Österreich/);
  assert.match(help, /Themenbereich/);
  assert.match(help, /Übungsprüfung/);
});
