import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const timeline = readFileSync('src/components/cockpit/widgets/TimelineWidget.tsx', 'utf8');
const instruction = readFileSync('src/components/cockpit/widgets/InstructionWidget.tsx', 'utf8');
const duties = readFileSync('src/components/cockpit/widgets/DiensteWidget.tsx', 'utf8');

test('Batch 3: kanonische Titel kommen aus dem gemeinsamen Widget-Katalog', () => {
  assert.equal(getCockpitWidgetDisplayLabel('timeline'), '🛤 Tagesablauf');
  assert.equal(getCockpitWidgetDisplayLabel('instruction'), '📝 Arbeitsauftrag');
  assert.equal(getCockpitWidgetDisplayLabel('dienste'), '🧹 Klassendienste');

  // The shared frame already names the widget; inner chrome must not repeat it.
  assert.doesNotMatch(instruction, />\s*Arbeitsauftrag\s*<\/span>/);
  assert.doesNotMatch(duties, />\s*Klassendienste\s*<\/span>/);
});

test('Batch 3: Arbeitsauftrag und Klassendienste nutzen das gemeinsame Kopfzeilen-Zahnrad', () => {
  assert.equal(cockpitWidgetSupportsSettings('instruction'), true);
  assert.equal(cockpitWidgetSupportsSettings('dienste'), true);

  assert.match(instruction, /showSettings: externalShowSettings/);
  assert.match(instruction, /externalSettingsWasOpenRef/);
  assert.match(instruction, /onCloseSettings\?\.\(\)/);
  assert.match(surface, /<InstructionWidgetContent[\s\S]{0,900}showSettings=\{\s*widgetSettingsOpenId === widget\.id\s*\}/);

  assert.match(duties, /showSettings: externalShowSettings/);
  assert.match(duties, /const manageMenuOpen = hasExternalSettingsControl \? externalShowSettings : showManageMenu/);
  assert.match(duties, /!hasExternalSettingsControl && \(/);
  assert.match(duties, /aria-label="Klassendienste-Einstellungen öffnen"/);
  assert.match(surface, /<DiensteWidgetContent[\s\S]{0,700}showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(surface, /<DiensteWidgetContent[\s\S]{0,900}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/);
});

test('Batch 3: neutrale Auswahl- und Aktionsakzente folgen der Profilfarbe', () => {
  assert.doesNotMatch(timeline, /indigo-/);
  assert.doesNotMatch(instruction, /indigo-/);
  assert.doesNotMatch(duties, /indigo-/);

  assert.match(timeline, /focus-visible:outline-accent/);
  assert.match(timeline, /ring-2 ring-accent/);
  assert.match(timeline, /rounded-full bg-accent/);

  assert.match(instruction, /bg-accent/);
  assert.match(instruction, /text-accent-text/);

  assert.match(duties, /bg-accent-soft hover:bg-accent hover:text-accent-text text-accent/);
  assert.match(duties, /manageMenuOpen[\s\S]{0,240}bg-accent text-accent-text border-accent/);
});

test('Batch 3: semantische Zustandsfarben und Touchziele bleiben erhalten', () => {
  // Timetable subject/status colors still carry meaning.
  assert.match(timeline, /bg-amber-500/);
  assert.match(timeline, /bg-emerald-600/);
  assert.match(timeline, /min-h-11 min-w-11/);

  // Absence/substitution warnings in duties remain amber/rose instead of being themed away.
  assert.match(duties, /assignee\.isAbsent[\s\S]{0,260}bg-amber-500\/10/);
  assert.match(duties, /studentAbsent[\s\S]{0,320}bg-rose-50\/50/);
  assert.match(duties, /min-h-11/);

  assert.match(instruction, /min-h-11/);
});
