import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Sternbilder-Zeichner ist als eigene geprüfte Komponente verdrahtet', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /ConstellationWidgetContent/);
  assert.match(cockpit, /case "constellation":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(cockpit, /w\.type === "constellation" && updates\.settings/);
  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"constellation",/);
  assert.match(widget, /constellation: \{ w: 48, h: 58 \}/);
});

test('Sternbilder-Zeichner erklärt Sternbild und Asterismus getrennt', () => {
  const source = readFileSync('src/components/cockpit/ConstellationWidgetContent.tsx', 'utf8');
  const model = readFileSync('src/lib/constellationWidgetModel.ts', 'utf8');

  assert.match(source, /88 Sternbilder/);
  assert.match(source, /Asterismen/);
  assert.match(model, /Großer Wagen/);
  assert.match(model, /kein eigenes Sternbild/);
  assert.match(model, /Großer Bär \(Ursa Major\)/);
});

test('Sternbilder-Zeichner ist Smartboard-tauglich und ohne unnötige Animationen', () => {
  const source = readFileSync('src/components/cockpit/ConstellationWidgetContent.tsx', 'utf8');

  assert.match(source, /min-h-11/);
  assert.match(source, /min-w-11/);
  assert.match(source, /bg-accent/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce|ping)/);
  assert.doesNotMatch(source, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
});

test('alte ungenaue Legacy-Komponente ist entfernt', () => {
  const legacy = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

  assert.doesNotMatch(legacy, /export const ConstellationWidgetContent/);
  assert.doesNotMatch(legacy, /Großer Wagen \/ Ursa Major/);
  assert.doesNotMatch(legacy, /Pharaonen-W/);
});

test('Hilfe nennt Entdecken, Verbinden und den Unterschied zu Asterismen', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');

  assert.match(help, /constellation: \['Öffne im Lehrercockpit/);
  assert.match(help, /Entdecken/);
  assert.match(help, /Verbinden/);
  assert.match(help, /Asterismus/);
  assert.match(help, /88/);
});
