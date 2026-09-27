import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const studio = readFileSync('src/components/cockpit/widgets/ZahlenraumStudio.tsx', 'utf8');

test('Zahlenraum-Studio nutzt den gemeinsamen Titel und die zentrale Zahnrad-Konfiguration', () => {
  assert.equal(getCockpitWidgetDisplayLabel('zahlenraum'), '🔢 Zahlenraum-Studio');
  assert.equal(cockpitWidgetSupportsSettings('zahlenraum'), true);
  assert.match(studio, /showSettings && <div/);
  assert.match(studio, /aria-label="Zahlenraum einstellen"/);
  assert.match(studio, /Zahlenraum-Einstellungen schließen/);
});

test('Zahlenraum-Studio folgt der KLASSIO-Akzentfarbe statt festem Indigo', () => {
  assert.doesNotMatch(studio, /indigo-/);
  assert.match(studio, /bg-accent text-accent-text/);
  assert.match(studio, /text-accent/);
  assert.match(studio, /border-accent/);
  assert.match(studio, /var\(--accent\)/);
});

test('Zahlenraum-Studio erzeugt keine eigene verschachtelte Scrollfläche', () => {
  assert.doesNotMatch(studio, /overflow-y-auto/);
  assert.match(studio, /min-h-full w-full flex flex-col select-none overflow-visible/);
  assert.match(studio, /flex-1 flex flex-col min-h-0 overflow-visible/);
});

test('Zahlenraum-Studio hält zentrale Eingaben und Aktionen touchfreundlich', () => {
  assert.match(studio, /min-h-11 w-24 px-2 rounded-lg/);
  assert.match(studio, /min-h-11 min-w-11/);
  assert.match(studio, /Zahl verringern/);
  assert.match(studio, /Zahl erhöhen/);
});

test('Zahlenraum-Studio passt Innenabstände an die echte Widgetgröße an', () => {
  assert.match(studio, /isCompact \? 'p-2 gap-2'/);
  assert.match(studio, /isFullscreen \? 'p-4 gap-4'/);
});
