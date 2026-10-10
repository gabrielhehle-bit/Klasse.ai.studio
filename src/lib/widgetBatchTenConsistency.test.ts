import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const contents = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');

function reflexSection(): string {
  const start = contents.indexOf('export const ReflexgameWidgetContent');
  assert.notEqual(start, -1, 'ReflexgameWidgetContent must exist');
  const end = contents.indexOf('// ==========================================', start + 30);
  return contents.slice(start, end === -1 ? contents.length : end);
}

const reflex = reflexSection();

test('Batch 10: Blitz-Reaktions-Trainer nutzt nur den gemeinsamen Widget-Titel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('reflexgame'), '⚡ Blitz-Reaktions-Trainer');
  assert.doesNotMatch(reflex, /⚡ Blitz-Reaktion/);
  assert.match(reflex, /Reaktionszeit-Duell · links A · rechts L/);
});

test('Batch 10: direkte Spielaktion bleibt sichtbar und hat kein sinnloses Zahnrad', () => {
  assert.equal(cockpitWidgetSupportsSettings('reflexgame'), false);
  assert.match(reflex, /Start Duell ⏱️/);
  assert.match(reflex, /Nochmal/);
  assert.match(reflex, /min-h-11/);
});

test('Batch 10: KLASSIO-Akzentfarbe statt festem Indigo', () => {
  assert.doesNotMatch(reflex, /indigo-/);
  assert.match(reflex, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.match(reflex, /focus-visible:ring-accent/);
});

test('Batch 10: Fehlstart löscht den ausstehenden Reaktions-Timer', () => {
  assert.match(reflex, /triggerTimerRef/);
  assert.match(reflex, /clearTimeout\(triggerTimerRef\.current\)/);
  assert.match(reflex, /if \(roundStateRef\.current === 'waiting'\)/);
  assert.match(reflex, /clearTriggerTimer\(\)/);
  assert.match(reflex, /useEffect\(\(\) => \(\) => clearTriggerTimer\(\)/);
});

test('Batch 10: Reaktionszeit nutzt monotone Zeitmessung und Status ist zugänglich', () => {
  assert.match(reflex, /performance\.now\(\)/);
  assert.match(reflex, /aria-live="polite"/);
  assert.match(reflex, /aria-label="Team Links drücken"/);
  assert.match(reflex, /aria-label="Team Rechts drücken"/);
});
