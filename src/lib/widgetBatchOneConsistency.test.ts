import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cockpitWidgetSupportsSettings } from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const clock = readFileSync('src/components/cockpit/widgets/ClockWidget.tsx', 'utf8');
const timer = readFileSync('src/components/cockpit/widgets/TimerWidget.tsx', 'utf8');
const traffic = readFileSync('src/components/cockpit/widgets/TrafficLightWidget.tsx', 'utf8');

test('Batch 1: Uhr und Timer verwenden das gemeinsame Einstellungs-Zahnrad', () => {
  assert.equal(cockpitWidgetSupportsSettings('clock'), true);
  assert.equal(cockpitWidgetSupportsSettings('timer'), true);

  assert.match(clock, /showSettings: externalShowSettings/);
  assert.match(clock, /externalShowSettings === undefined &&/);
  assert.match(clock, /onCloseSettings\?\.\(\)/);
  assert.match(surface, /<ClockWidgetContent[\s\S]{0,700}showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(surface, /<ClockWidgetContent[\s\S]{0,900}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/);

  assert.match(timer, /showSettings: externalShowSettings/);
  assert.match(surface, /<TimerWidgetContent[\s\S]{0,700}showSettings=\{widgetSettingsOpenId === widget\.id\}/);
});

test('Batch 1: reine Auswahlzustände folgen der Klassio-Akzentfarbe', () => {
  assert.doesNotMatch(clock, /indigo-/);
  assert.doesNotMatch(timer, /indigo-/);
  assert.doesNotMatch(traffic, /indigo-/);

  assert.match(clock, /bg-accent text-accent-text border-accent/);
  assert.match(timer, /bg-accent/);
  assert.match(timer, /stroke-accent/);
  assert.match(traffic, /border-accent bg-accent-soft text-accent/);
});

test('Batch 1: semantische Zustandsfarben und Touchziele bleiben erhalten', () => {
  assert.match(timer, /bg-emerald-500/);
  assert.match(timer, /bg-amber-500/);
  assert.match(timer, /bg-rose-500/);
  assert.match(timer, /min-h-11 min-w-11/);

  assert.match(traffic, /case 'rose'/);
  assert.match(traffic, /case 'amber'/);
  assert.match(traffic, /case 'emerald'/);
  assert.match(traffic, /min-h-11 min-w-0/);
  assert.match(traffic, /min-h-\[44px\]/);

  assert.match(clock, /w-11 h-11/);
  assert.match(clock, /min-h-\[44px\]/);
});
