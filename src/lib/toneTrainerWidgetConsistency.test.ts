import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const TonetrainerWidgetContent');
const end = source.indexOf('// 14. WIDGET: WINKEL-DETEKTIV', start);
const widget = source.slice(start, end);

test('Ton-Trainer nutzt einen gemeinsamen AudioContext statt einen pro Ton', () => {
  assert.match(widget, /audioContextRef = useRef<AudioContext \| null>/);
  assert.match(widget, /const getAudioContext =/);
  assert.match(widget, /audioContextRef\.current/);
});

test('Ton-Trainer räumt Hörfolgen und AudioContext beim Unmount auf', () => {
  assert.match(widget, /const clearTimers = useCallback/);
  assert.match(widget, /window\.clearTimeout/);
  assert.match(widget, /audioContextRef\.current\.close/);
});

test('Ton-Trainer trennt Freispiel, Nachspielen und Liedlernen klar', () => {
  assert.match(widget, /type Mode = 'freeplay' \| 'memory' \| 'learn'/);
  assert.match(widget, /Freispiel/);
  assert.match(widget, /Nachspielen/);
  assert.match(widget, /Lied lernen/);
});

test('Ton-Trainer unterstützt Tastatur 1 bis 8', () => {
  assert.match(widget, /key: '1'/);
  assert.match(widget, /key: '8'/);
  assert.match(widget, /window\.addEventListener\('keydown'/);
});

test('Ton-Trainer nutzt große Klangstäbe, Touchflächen und KLASSIO-Akzent', () => {
  assert.match(widget, /min-w-10 sm:min-w-12/);
  assert.match(widget, /min-h-11 px-4 rounded-xl bg-accent/);
  assert.match(widget, /bg-accent text-accent-text/);
});

test('Ton-Trainer besitzt keinen doppelten Innentitel und keine eigene Scrollfläche', () => {
  assert.doesNotMatch(widget, />\s*🎵 Tonleiter-Entdecker/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full/);
});


test('Ton-Trainer visualisiert Tonhöhenrichtung und Zielton', () => {
  assert.match(widget, /Tonhöhe steigt von links nach rechts/);
  assert.match(widget, />tiefer</);
  assert.match(widget, />höher</);
  assert.match(widget, /Nächster Ton/);
});

test('Ton-Trainer bietet im Nachspielmodus erneutes Anhören', () => {
  assert.match(widget, /Nochmal anhören/);
  assert.match(widget, /playSequence\(memorySequence\)/);
  assert.match(widget, /Richtung der Tonhöhen/);
});


test('Ton-Trainer bietet einen geführten Oktav-Lernmoment', () => {
  assert.match(widget, /const playScale =/);
  assert.match(widget, /Tonleiter anhören/);
  assert.match(widget, /C bis C₂.*Oktave/);
  assert.match(widget, /Schritt für Schritt höher/);
});

test('Ton-Trainer blockiert globale Zahlentasten in Eingabefeldern', () => {
  assert.match(widget, /closest\('input, select, textarea, \[contenteditable="true"\]'\)/);
});

test('Ton-Trainer kündigt Feedback barrierearm an', () => {
  assert.match(widget, /aria-live="polite"/);
});
