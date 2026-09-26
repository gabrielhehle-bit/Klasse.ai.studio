import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const contents = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

function section(name: string): string {
  const start = contents.indexOf(`export const ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = contents.indexOf('// ==========================================', start + 30);
  return contents.slice(start, end === -1 ? contents.length : end);
}

const challenge = section('ChallengeWidgetContent');
const cryptograph = section('SecretagentWidgetContent');
const weightscale = section('WeightscaleWidgetContent');

test('Batch 9: Lernspiel-Widgets behalten ihre kanonischen Titel nur im gemeinsamen Rahmen', () => {
  assert.equal(getCockpitWidgetDisplayLabel('challenge'), '🎯 Klassen-Challenge');
  assert.equal(getCockpitWidgetDisplayLabel('secretagent'), '🕵️‍♂️ Klassen-Kryptograph');
  assert.equal(getCockpitWidgetDisplayLabel('weightscale'), '⚖️ Waagen-Schätzer');

  assert.doesNotMatch(challenge, />\s*Klassen-Challenge\s*</);
  assert.doesNotMatch(cryptograph, /🕵️‍♂️ Klassen-Kryptograph/);
  assert.doesNotMatch(weightscale, /⚖️ Waagen-Schätzer/);
});

test('Batch 9: direkte Lernaktionen bleiben sichtbar statt hinter einem sinnlosen Zahnrad zu verschwinden', () => {
  assert.equal(cockpitWidgetSupportsSettings('challenge'), false);
  assert.equal(cockpitWidgetSupportsSettings('secretagent'), false);
  assert.equal(cockpitWidgetSupportsSettings('weightscale'), false);

  assert.match(challenge, /Klasse geschafft!/);
  assert.match(challenge, /🎲 Neu/);
  assert.match(cryptograph, /Caesar-Verschlüsselung/);
  assert.match(cryptograph, /Drehen & Testen/);
  assert.match(weightscale, /handleModeChange\('free'\)/);
  assert.match(weightscale, /handleModeChange\('mystery'\)/);
});

test('Batch 9: neutrale Lernspiel-Bedienung folgt der Profil-Akzentfarbe', () => {
  for (const widget of [challenge, cryptograph, weightscale]) {
    assert.doesNotMatch(widget, /indigo-/);
    assert.match(widget, /text-accent|bg-accent/);
  }

  assert.match(challenge, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.match(cryptograph, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.match(weightscale, /bg-accent hover:bg-accent-hover text-accent-text/);
});

test('Batch 9: Erfolgs-, Hinweis- und Löschfarben bleiben semantisch', () => {
  assert.match(challenge, /bg-emerald-500/);
  assert.match(cryptograph, /bg-emerald-500\/10/);
  assert.match(cryptograph, /bg-amber-50\/80/);
  assert.match(weightscale, /bg-rose-600 hover:bg-rose-700/);
  assert.match(weightscale, /text-emerald-500/);
});

test('Batch 9: zentrale Kinder- und Spielaktionen haben mindestens 44px Touchhöhe', () => {
  assert.match(challenge, /min-h-11/);
  assert.match(cryptograph, /min-h-11/);
  assert.match(weightscale, /min-h-11/);
});

test('Batch 9: Kryptograph-Tresor nutzt den angekündigten Bereich 1 bis 10', () => {
  assert.match(cryptograph, /Math\.floor\(Math\.random\(\) \* 10\) \+ 1/);
  assert.doesNotMatch(cryptograph, /Math\.floor\(Math\.random\(\) \* 9\) \+ 1/);
  assert.match(cryptograph, /max="10"/);
  assert.match(cryptograph, /Geheimer Zahlencode 1-10/);
});
