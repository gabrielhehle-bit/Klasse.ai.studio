import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const start = source.indexOf('export const WastebinWidgetContent');
const end = source.indexOf('export const TonetrainerWidgetContent', start);
const widget = source.slice(start, end);

test('Müll-Trenner erklärt jede Antwort statt nur Punkte zu vergeben', () => {
  assert.match(widget, /Warum\?/);
  assert.match(widget, /currentItem\.explanation/);
  assert.doesNotMatch(widget, /highScore|streak|Rekord:/);
});

test('Müll-Trenner nutzt klare, kindgerechte Entsorgungskategorien', () => {
  assert.match(widget, /Biomüll/);
  assert.match(widget, /Altpapier/);
  assert.match(widget, /Verpackung/);
  assert.match(widget, /Sammelstelle/);
  assert.match(widget, /Restmüll/);
});

test('Müll-Trenner weist auf regionale Unterschiede hin', () => {
  assert.match(widget, /Entsorgungsregeln können regional abweichen/);
  assert.match(widget, /örtlichen Gemeinde bzw\. Abfallberatung/);
});

test('Müll-Trenner zeigt Lernfortschritt ohne Serien-Gamification', () => {
  assert.match(widget, /correctCount/);
  assert.match(widget, /attemptCount/);
  assert.match(widget, /Trefferquote/);
  assert.doesNotMatch(widget, /Serie|🔥/);
});

test('Müll-Trenner nutzt große Touchflächen und KLASSIO-Akzent', () => {
  assert.match(widget, /min-h-20 rounded-2xl/);
  assert.match(widget, /min-h-11 rounded-xl bg-accent/);
  assert.doesNotMatch(widget, /indigo-/);
});

test('Müll-Trenner besitzt keinen doppelten Innentitel und keine eigene Scrollfläche', () => {
  assert.doesNotMatch(widget, />\s*♻️ Müll-Trenner/);
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.match(widget, /min-h-full w-full/);
});


test('Müll-Trenner vermittelt Kategorie-Regeln und Transfer', () => {
  assert.match(widget, /const categoryRule/);
  assert.match(widget, /organische Küchen- und Pflanzenreste/);
  assert.match(widget, /leere Verpackungen aus Kunststoff oder Metall/);
  assert.match(widget, /Batterien und Elektrogeräte/);
  assert.match(widget, /Denkregel:/);
});


test('Müll-Trenner vermittelt eine Merkregel pro Entsorgungskategorie', () => {
  assert.match(widget, /rule: 'organisch und kompostierbar'/);
  assert.match(widget, /rule: 'sauber und überwiegend aus Papier'/);
  assert.match(widget, /rule: 'eine leere Verpackung'/);
  assert.match(widget, /rule: 'gefährlich, elektrisch oder speziell zu sammeln'/);
  assert.match(widget, /Merkregel:/);
  assert.match(widget, /correctBinMeta\.rule/);
});
