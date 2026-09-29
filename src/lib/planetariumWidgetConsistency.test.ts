import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Planetensystem ist als eigene geprüfte Komponente verdrahtet', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /from ".\/cockpit\/PlanetariumWidgetContent"/);
  assert.match(cockpit, /case "planetarium":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(cockpit, /w\.type === "planetarium" && updates\.settings/);
  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"planetarium",/);
  assert.match(widget, /planetarium: \{ w: 50, h: 60 \}/);
});

test('alte Planetarium-Implementierung ist aus NewWidgets entfernt', () => {
  const legacy = readFileSync('src/components/cockpit/NewWidgets.tsx', 'utf8');
  assert.doesNotMatch(legacy, /export const PlanetariumWidgetContent/);
  assert.doesNotMatch(legacy, /Orbit Simulator v2\.0/);
  assert.doesNotMatch(legacy, /canvas-confetti/);
});

test('Planetensystem ist Smartboard-tauglich und verwendet Akzentlogik', () => {
  const source = readFileSync('src/components/cockpit/PlanetariumWidgetContent.tsx', 'utf8');
  assert.match(source, /min-h-11/);
  assert.match(source, /min-w-11/);
  assert.match(source, /bg-accent/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce|ping)/);
  assert.doesNotMatch(source, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
});

test('Hilfe erklärt Entdecken, Umläufe, Quiz und Pluto-Einordnung', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');
  assert.match(help, /planetarium: \['Öffne im Lehrercockpit/);
  assert.match(help, /Umläufe/);
  assert.match(help, /acht Planeten/);
  assert.match(help, /Pluto/);
  assert.match(help, /August 2026/);
});
