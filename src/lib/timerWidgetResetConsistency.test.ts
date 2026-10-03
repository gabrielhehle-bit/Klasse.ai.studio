import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COCKPIT_WIDGET_LIBRARY_ITEMS } from './cockpitWidgetCatalog';

const timer = readFileSync('src/components/cockpit/widgets/TimerWidget.tsx', 'utf8');
const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
const help = readFileSync('src/lib/helpContent.ts', 'utf8');

test('Widget-Neustart 3 folgt der Bibliotheksreihenfolge', () => {
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS[2]?.type, 'timer');
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS[2]?.label, '⏳ Timer / Sanduhr');
});

test('Timer startet kompakt und verwendet dieselbe Standard- und Optimalgröße', () => {
  assert.match(cockpit, /id: "widget-timer",[\s\S]{0,180}w: 23,[\s\S]{0,80}h: 38/);
  assert.match(frame, /timer: \{ w: 23, h: 38 \}/);
});

test('Timer bleibt mit jeder Profil-Akzentfarbe lesbar und ruhig', () => {
  assert.doesNotMatch(timer, /bg-accent[^"'\n]*text-white/);
  assert.match(timer, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.doesNotMatch(timer, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
  assert.doesNotMatch(timer, /animate-pulse/);
  assert.match(timer, /bg-rose-50\/80 border border-rose-200/);
});

test('Timer verhindert ungültige Minus- und Plus-Zeiten', () => {
  assert.match(timer, /const canSubtractMinute = status === 'running' \? remainingSeconds > 0 : remainingSeconds > 60/);
  assert.match(timer, /disabled=\{!canSubtractMinute\}/);
  assert.match(timer, /if \(remainingSeconds <= 60\) return/);
  assert.match(timer, /Math\.min\(MAX_CLASS_TIMER_SECONDS, currentRemaining \+ 60\)/);
  assert.match(timer, /Math\.min\(MAX_CLASS_TIMER_SECONDS, remainingSeconds \+ 60\)/);
});

test('Timer-Overlays sind zugängliche Dialoge', () => {
  assert.match(timer, /role="dialog"[\s\S]*aria-label="Timer-Schnellauswahl"/);
  assert.match(timer, /role="dialog"[\s\S]*aria-label="Eigene Timer-Zeit einstellen"/);
  assert.match(timer, /role="dialog"[\s\S]*aria-label="Timer-Optionen"/);
  assert.match(timer, /aria-label="Schnellauswahl schließen"/);
  assert.match(timer, /aria-label="Eigene Zeit schließen"/);
});

test('Timer-Hilfe erklärt Dauer, Laufzeitänderung, Darstellung und Tastatur', () => {
  assert.match(help, /timer: \['Öffne im Lehrercockpit „Widget hinzufügen“ → „Timer \/ Sanduhr“/);
  assert.match(help, /1 Sekunde bis 12 Stunden/);
  assert.match(help, /\+1 Minute/);
  assert.match(help, /Kreis-Ring, Balken oder nur die Zeit/);
  assert.match(help, /Leertaste/);
  assert.match(help, /Standby/);
});
