import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const TonetrainerWidgetContent');
const end = source.indexOf('// 14. WIDGET: WINKEL-DETEKTIV', start);
const widget = source.slice(start, end);

test('Tonleiter-Entdecker verwendet einen gemeinsamen AudioContext', () => {
  assert.match(widget, /const audioContextRef = useRef<AudioContext \| null>/);
  assert.match(widget, /audioContextRef\.current = new AudioCtx\(\)/);
  assert.match(widget, /audioContextRef\.current\.close/);
});

test('Tonleiter-Entdecker räumt zeitgesteuerte Tonfolgen zuverlässig auf', () => {
  assert.match(widget, /const timersRef = useRef<number\[]>/);
  assert.match(widget, /const clearTimers = useCallback/);
  assert.match(widget, /timersRef\.current\.forEach/);
});

test('Tonleiter-Entdecker trennt Freispiel, Nachspielen und Liedlernen', () => {
  assert.match(widget, /Freispiel/);
  assert.match(widget, /Nachspielen/);
  assert.match(widget, /Lied lernen/);
  assert.match(widget, /Nochmal anhören/);
});

test('Tonleiter-Entdecker bietet einen geführten Oktav-Lernmoment', () => {
  assert.match(widget, /const playScale =/);
  assert.match(widget, /Tonleiter anhören/);
  assert.match(widget, /C bis C₂.*Oktave/);
  assert.match(widget, /Schritt für Schritt höher/);
});

test('Tonleiter-Entdecker blockiert globale Zahlentasten in Eingabefeldern', () => {
  assert.match(widget, /closest\('input, select, textarea, \[contenteditable="true"\]'\)/);
});

test('Tonleiter-Entdecker nutzt große Klangstäbe und KLASSIO-Akzent', () => {
  assert.match(widget, /min-h-11 px-4 rounded-xl/);
  assert.match(widget, /bg-accent text-accent-text/);
  assert.match(widget, /min-w-10 sm:min-w-12/);
});

test('Tonleiter-Entdecker besitzt keinen doppelten Innentitel oder eigene Scrollfläche', () => {
  assert.doesNotMatch(widget, />\s*🎵 Tonleiter-Entdecker\s*</);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full/);
});

test('Tonleiter-Entdecker kündigt Feedback barrierearm an', () => {
  assert.match(widget, /aria-live="polite"/);
});
