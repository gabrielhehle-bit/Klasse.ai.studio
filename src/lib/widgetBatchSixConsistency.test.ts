import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const todo = readFileSync('src/components/cockpit/widgets/TodoWidget.tsx', 'utf8');
const phases = readFileSync('src/components/cockpit/widgets/PhasesWidget.tsx', 'utf8');
const homework = readFileSync('src/components/cockpit/widgets/HomeworkWidget.tsx', 'utf8');

test('Batch 6: Struktur-Widgets behalten kanonische Katalogtitel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('todo'), '📝 Aufgaben-Checkliste');
  assert.equal(getCockpitWidgetDisplayLabel('phases'), '🧭 Unterrichtsphasen');
  assert.equal(getCockpitWidgetDisplayLabel('homework'), '📚 Hausübungen');

  // Shared frame owns the widget title; homework no longer renders a second full title.
  assert.doesNotMatch(homework, /Unsere Hausübungen/);
});

test('Batch 6: Aufgaben und Phasen verwenden das gemeinsame Zahnrad', () => {
  assert.equal(cockpitWidgetSupportsSettings('todo'), true);
  assert.equal(cockpitWidgetSupportsSettings('phases'), true);

  assert.match(todo, /showSettings: externalShowSettings/);
  assert.match(todo, /const isEditMode = hasExternalSettingsControl \? externalShowSettings : localEditMode/);
  assert.match(todo, /Aufgaben-Einstellungen schließen/);

  assert.match(phases, /showSettings: externalShowSettings/);
  assert.match(phases, /const isManaging = hasExternalSettingsControl \? externalShowSettings : true/);
  assert.match(phases, /Phasen-Einstellungen schließen/);

  assert.match(
    surface,
    /<PhasesWidgetContent[\s\S]{0,1100}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
  assert.match(
    surface,
    /<TodoWidgetContent[\s\S]{0,1100}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
});

test('Batch 6: Phasen-Aenderungen sind im Cockpit bewusst hinter Einstellungen geschuetzt', () => {
  assert.match(phases, /\{isManaging && \(\s*<button[\s\S]{0,450}Phase hinzufügen/);
  assert.match(phases, /Editing is deliberately available only through the shared settings gear/);
  assert.match(phases, /\{isManaging && \([\s\S]{0,900}handleStartEdit/);
  assert.match(phases, /\{phases\.length > 1 && \([\s\S]{0,500}handleDelete/);
});

test('Batch 6: neutrale Interaktionen folgen der Profil-Akzentfarbe', () => {
  assert.doesNotMatch(todo, /indigo-/);
  assert.match(todo, /bg-accent text-accent-text border-accent/);
  assert.match(todo, /progress\.allDone[\s\S]{0,180}'bg-accent'/);
  assert.match(todo, /focus:border-accent/);
  assert.match(todo, /bg-accent hover:bg-accent-hover/);

  assert.doesNotMatch(phases, /indigo-/);
  assert.match(phases, /w-6 bg-accent/);
  assert.match(phases, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.match(phases, /bg-accent text-accent-text border-accent/);

  assert.match(homework, /border-accent bg-accent text-accent-text/);
  assert.match(homework, /bg-accent-soft font-black text-accent/);
  assert.doesNotMatch(homework, /border-2 border-amber-400/);
  assert.doesNotMatch(homework, /bg-amber-100/);
});

test('Batch 6: semantische Erfolgs-, Zusatz- und Loeschfarben bleiben erhalten', () => {
  // Completed todos and completed/past phases stay green.
  assert.match(todo, /bg-emerald-500/);
  assert.match(phases, /bg-emerald-500/);

  // Bonus / reset confirmation remains amber; destructive actions remain rose.
  assert.match(todo, /bg-amber-50/);
  assert.match(todo, /bg-rose-600/);
  assert.match(phases, /hover:bg-rose-500\/10 hover:text-rose-500/);
});

test('Batch 6: zentrale Aktionen bleiben touchfreundlich', () => {
  assert.match(todo, /min-h-11 min-w-11/);
  assert.match(phases, /min-h-11 min-w-11/);
  assert.match(homework, /min-h-11 min-w-11/);
});
