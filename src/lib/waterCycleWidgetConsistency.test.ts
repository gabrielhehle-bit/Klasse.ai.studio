import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Wasserkreislauf ist als eigene geprüfte Komponente im Cockpit verdrahtet', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /WaterCycleWidgetContent/);
  assert.match(cockpit, /case "watercycle":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(cockpit, /w\.type === "watercycle" && updates\.settings/);
  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"watercycle",/);
  assert.match(widget, /watercycle: \{ w: 48, h: 58 \}/);
});

test('Wasserkreislauf hat Smartboard-Bedienung und keine KI-Fragen', () => {
  const source = readFileSync('src/components/cockpit/WaterCycleWidgetContent.tsx', 'utf8');

  assert.match(source, /min-h-11/);
  assert.match(source, /min-h-12/);
  assert.match(source, /bg-accent/);
  assert.doesNotMatch(source, /askAI|KI-Frage|fetchAiQuestion|Gemini|OpenAI/);
  assert.doesNotMatch(source, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce|ping)/);
});

test('alte fachlich problematische Wasserkreislauf-Komponente ist entfernt', () => {
  const legacy = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

  assert.doesNotMatch(legacy, /export const WatercycleWidgetContent/);
  assert.doesNotMatch(legacy, /dichten, unbeweglichen Gitter/);
  assert.doesNotMatch(legacy, /herrlich weiche Wolken/);
  assert.doesNotMatch(legacy, /Sicker-KI/);
});

test('Hilfe erklärt Grundmodell, Verzweigungen und feste Quellen', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');

  assert.match(help, /watercycle: \['Öffne im Lehrercockpit/);
  assert.match(help, /Grundmodell/);
  assert.match(help, /Versickerung/);
  assert.match(help, /USGS/);
  assert.match(help, /NASA/);
});
