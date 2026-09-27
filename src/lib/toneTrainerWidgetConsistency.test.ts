import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const TonetrainerWidgetContent');
const end = source.indexOf('// 14. WIDGET: WINKEL-DETEKTIV', start);
const widget = source.slice(start, end);

test('Ton-Trainer fokussiert drei klare Lernmodi', () => {
  assert.match(widget, /type Mode = 'explore' \| 'echo' \| 'song'/);
  assert.match(widget, /Töne entdecken/);
  assert.match(widget, /Nachspielen/);
  assert.match(widget, /Lied lernen/);
});

test('Ton-Trainer nutzt musikalische Instrumente statt Singvogel-Modus', () => {
  assert.match(widget, /xylophon/);
  assert.match(widget, /glockenspiel/);
  assert.match(widget, /klavier/);
  assert.doesNotMatch(widget, /Singvögel|instrument === 'vogel'/);
});

test('Ton-Trainer verwendet einen wiederverwendeten AudioContext und räumt ihn auf', () => {
  assert.match(widget, /audioContextRef/);
  assert.match(widget, /if \(!audioContextRef\.current \|\| audioContextRef\.current\.state === 'closed'\)/);
  assert.match(widget, /audioContextRef\.current\.close/);
});

test('Ton-Trainer unterstützt Hörfolgen mit 3, 4 oder 5 Tönen', () => {
  assert.match(widget, /useState<3 \| 4 \| 5>\(3\)/);
  assert.match(widget, /Neue Hörfolge/);
  assert.match(widget, /Noch einmal hören/);
});

test('Ton-Trainer bietet große Spielstäbe und Tastatursteuerung', () => {
  assert.match(widget, /Taste \$\{index \+ 1\}/);
  assert.match(widget, /window\.addEventListener\('keydown'/);
  assert.match(widget, /min-w-10/);
  assert.match(widget, /min-h-11/);
});

test('Ton-Trainer nutzt KLASSIO-Akzent und keine eigene Scrollfläche oder doppelten Titel', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.doesNotMatch(widget, />\s*🎵 Tonleiter-Entdecker/);
  assert.match(widget, /bg-accent text-accent-text/);
});

test('Ton-Trainer kündigt Lernfeedback barrierearm an', () => {
  assert.match(widget, /aria-live="polite"/);
  assert.match(widget, /Von links nach rechts werden die Töne höher/);
});


test('Ton-Trainer macht Tonrichtung als Lernziel sichtbar', () => {
  assert.match(widget, /const describeDirection =/);
  assert.match(widget, /steigend/);
  assert.match(widget, /fallend/);
  assert.match(widget, /mit Sprüngen nach oben und unten/);
  assert.match(widget, /Tonverlauf/);
  assert.match(widget, /Visueller Tonverlauf/);
});

test('Ton-Trainer erklärt Fehler im Nachspielmodus als zu hoch oder zu tief', () => {
  assert.match(widget, /const relation = index > target \? 'zu hoch' : 'zu tief'/);
  assert.match(widget, /Dieser Ton war \$\{relation\}/);
});
