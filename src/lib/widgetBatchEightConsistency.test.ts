import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cockpitWidgetSupportsSettings, getCockpitWidgetDisplayLabel } from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const stopwatch = readFileSync('src/components/cockpit/widgets/StopwatchWidget.tsx', 'utf8');
const calculator = readFileSync('src/components/cockpit/widgets/CalculatorWidget.tsx', 'utf8');
const legacyContents = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

test('Batch 8: Tafelwerkzeuge behalten kanonische Titel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('stopwatch'), '⏱️ Stoppuhr');
  assert.equal(getCockpitWidgetDisplayLabel('calculator'), '🧮 Grundschulrechner');
  assert.equal(getCockpitWidgetDisplayLabel('dice'), '🎲 Tafel-Würfel');
});

test('Batch 8: Stoppuhr und Würfel nutzen das gemeinsame Zahnrad', () => {
  assert.equal(cockpitWidgetSupportsSettings('stopwatch'), true);
  assert.equal(cockpitWidgetSupportsSettings('dice'), true);

  assert.match(stopwatch, /showSettings\?: boolean/);
  assert.match(stopwatch, /Stoppuhr einstellen/);
  assert.match(stopwatch, /Zehntelsekunden anzeigen/);
  assert.match(stopwatch, /Stoppuhr-Einstellungen schließen/);

  assert.match(legacyContents, /showSettings\?: boolean/);
  assert.match(legacyContents, /Tafel-Würfel einstellen/);
  assert.match(legacyContents, /Anzahl Würfel/);
  assert.match(legacyContents, /Rechenart/);

  assert.match(
    surface,
    /<StopwatchWidgetContent[\s\S]{0,1200}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
  assert.match(
    surface,
    /<DiceWidgetContent[\s\S]{0,1000}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
});

test('Batch 8: Würfelstruktur liegt im Cockpit hinter Einstellungen, Würfeln bleibt direkt', () => {
  assert.match(legacyContents, /hasExternalSettingsControl \? \(/);
  assert.match(legacyContents, /Anzahl\/Rechenart liegen im gemeinsamen Zahnrad/);
  assert.match(legacyContents, /!hasExternalSettingsControl && dice\.length > 1/);
  assert.match(legacyContents, /!hasExternalSettingsControl && \([\s\S]{0,700}Einen Würfel entfernen/);
  assert.match(legacyContents, /aria-label="Würfel werfen"/);
  assert.match(legacyContents, /min-h-11 flex-1 rounded-xl bg-accent/);
});

test('Batch 8: Profil-Akzentfarbe steuert neutrale Tafelaktionen', () => {
  assert.match(stopwatch, /focus-visible:ring-accent/);
  assert.match(stopwatch, /border-accent bg-accent-soft/);
  assert.match(stopwatch, /bg-accent px-4 text-sm font-black text-accent-text/);

  assert.match(calculator, /bg-accent text-accent-text border-accent/);
  assert.match(calculator, /equalsBtnClass = `flex-1 min-h-11 rounded-xl bg-accent/);
  assert.match(calculator, /text-accent/);

  assert.match(legacyContents, /border-accent bg-accent text-sm font-black text-accent-text/);
  assert.match(legacyContents, /bg-accent px-4 text-sm font-black uppercase/);
});

test('Batch 8: semantische Zeit-, Rechen- und Würfelfarben bleiben erhalten', () => {
  // Running / paused / reset semantics stay green, amber and rose.
  assert.match(stopwatch, /bg-emerald-600/);
  assert.match(stopwatch, /bg-amber-500/);
  assert.match(stopwatch, /bg-rose-600/);

  // Calculator operators stay visually grouped in amber; errors stay rose.
  assert.match(calculator, /bg-amber-50/);
  assert.match(calculator, /text-rose-500/);

  // Dice modes retain green / blue / amber / rose physical-die semantics.
  assert.match(legacyContents, /from-emerald-400 to-emerald-600/);
  assert.match(legacyContents, /from-blue-400 to-blue-600/);
  assert.match(legacyContents, /from-amber-400 to-amber-600/);
  assert.match(legacyContents, /from-rose-400 to-red-600/);
});

test('Batch 8: sekundäre Tafelaktionen bleiben mindestens 44px touchfreundlich', () => {
  assert.match(stopwatch, /min-h-11 min-w-11/);
  assert.match(stopwatch, /min-h-11 rounded-xl border/);

  assert.match(calculator, /flex min-h-11 items-center gap-1 rounded-xl/);
  assert.match(calculator, /flex min-h-11 min-w-11 items-center justify-center/);
  assert.match(calculator, /min-h-11 w-full rounded-lg/);

  assert.match(legacyContents, /min-h-11 min-w-11 rounded-lg/);
  assert.match(legacyContents, /min-h-11 rounded-xl bg-amber-500/);
});
