import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function pianoSource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const PianoWidgetContent');
  const end = source.indexOf('// ==========================================', start + 20);
  assert.ok(start >= 0 && end > start, 'PianoWidgetContent must exist');
  return source.slice(start, end);
}

test('Klassen-Klavier nutzt zentrale Widget-Einstellungen', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = pianoSource();

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"piano",/);
  assert.match(cockpit, /case "piano":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(source, /Klassen-Klavier-Einstellungen/);
  assert.match(source, /Beschriftung/);
  assert.match(source, /Lautstärke/);
});

test('Klassen-Klavier verwendet einen wiederverwendeten AudioContext', () => {
  const source = pianoSource();

  assert.match(source, /const audioContextRef = useRef<AudioContext \| null>\(null\)/);
  assert.match(source, /if \(!ctx \|\| ctx\.state === 'closed'\)/);
  assert.match(source, /audioContextRef\.current = ctx/);
  assert.match(source, /void ctx\.close\(\)/);
  assert.doesNotMatch(source, /const ctx = new AudioCtx\(\);[\s\S]*const playNote/);
});

test('Klassen-Klavier ist touch- und tastaturfreundlich', () => {
  const source = pianoSource();

  assert.match(source, /grid-cols-8/);
  assert.match(source, /min-h-24/);
  assert.match(source, /Tasten 1–8/);
  assert.match(source, /window\.addEventListener\('keydown'/);
  assert.match(source, /PIANO_KEYS\.find\(item => item\.shortcut === event\.key\)/);
  assert.match(source, /aria-live="polite"/);
});

test('Klassen-Klavier folgt der KLASSIO-Oberfläche ohne doppelten Innentitel', () => {
  const source = pianoSource();

  assert.doesNotMatch(source, /Klassen-Klavier Musik-Ecke/);
  assert.doesNotMatch(source, /text-\[(?:6|7|7\.5|8)px\]/);
  assert.match(source, /bg-accent-soft/);
  assert.match(source, /focus-visible:ring-accent/);
});

test('Klassen-Klavier Settings werden atomar gemerged und Höhe ist verbessert', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /w\.type === "piano" && updates\.settings/);
  assert.match(cockpit, /id: "widget-piano",[\s\S]{0,160}w: 55,[\s\S]{0,60}h: 42/);
  assert.match(widget, /piano: \{ w: 55, h: 42 \}/);
});
