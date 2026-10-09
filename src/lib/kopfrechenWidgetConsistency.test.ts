import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const studio = readFileSync('src/components/cockpit/widgets/KopfrechenStudio.tsx', 'utf8');

test('Kopfrechentrainer nutzt gemeinsamen Titel und zentrale Einstellungen', () => {
  assert.equal(getCockpitWidgetDisplayLabel('kopfrechnen'), '🧠 Kopfrechentrainer');
  assert.equal(cockpitWidgetSupportsSettings('kopfrechnen'), true);
  assert.match(studio, /showSettingsDrawer/);
  assert.match(studio, /aria-label="Kopfrechnen-Einstellungen"/);
  assert.match(studio, /Kopfrechnen-Einstellungen schließen/);
});

test('Kopfrechentrainer folgt überall der KLASSIO-Akzentfarbe', () => {
  assert.doesNotMatch(studio, /indigo-/);
  assert.match(studio, /bg-accent text-accent-text/);
  assert.match(studio, /text-accent/);
  assert.match(studio, /hover:bg-accent-hover/);
  assert.match(studio, /focus-visible:ring-accent/);
});

test('Kopfrechentrainer hält die Aufgabe im nativen Rahmen und öffnet Einstellungen außerhalb', () => {
  assert.match(studio, /h-full min-h-0 w-full flex flex-col/);
  assert.match(studio, /showSettingsDrawer && createPortal/);
  assert.match(studio, /dialog\.showModal\(\)/);
  assert.match(studio, /max-h-\[85dvh\] overflow-y-auto/);
  assert.match(studio, /settingsTrigger\?\.isConnected/);
});

test('Kopfrechentrainer behält direkte Lehrer- und Schülerinteraktion touchfreundlich', () => {
  assert.match(studio, /presentationMode === 'teacher'/);
  assert.match(studio, /presentationMode === 'student'/);
  assert.match(studio, /min-h-11 min-w-11/);
  assert.match(studio, /min-h-\[44px\]/);
  assert.match(studio, /aria-label="Ergebnis eingeben"/);
});

test('Kopfrechentrainer behält lokale Tastatursteuerung statt globale Shortcuts', () => {
  assert.match(studio, /onKeyDown=\{handleKeyDown\}/);
  assert.match(studio, /target\.closest\('button, select, textarea/);
  assert.match(studio, /e\.key === 'Enter'/);
  assert.match(studio, /e\.key === ' '/);
});
