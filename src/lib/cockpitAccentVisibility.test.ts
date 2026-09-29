import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf8');
const fraction = readFileSync('src/components/cockpit/widgets/FractionVisualizer.tsx', 'utf8');

test('Cockpit leitet beliebige Profil-Akzentfarben in kontrastsichere Widget-Farben ab', () => {
  assert.match(css, /--accent-ink: color-mix\(in srgb, var\(--accent\) 45%, var\(--text\) 55%\)/);
  assert.match(css, /--accent-visual: color-mix\(in srgb, var\(--accent\) 55%, var\(--text\) 45%\)/);
  assert.match(css, /klassio-cockpit-shell[\s\S]*--accent-ink/);
  assert.match(css, /cockpit-widget-content \.text-accent[\s\S]*var\(--accent-ink\)/);
  assert.match(css, /cockpit-widget-content \.fill-accent[\s\S]*var\(--accent-visual\)/);
  assert.match(css, /cockpit-widget-content \.border-accent[\s\S]*var\(--accent-visual\)/);
});

test('Bruch-Visualisierer profitiert von kontrastsicherem Text und kontrastsicherer Füllung', () => {
  assert.match(fraction, /text-accent/);
  assert.match(fraction, /fill-accent/);
  assert.match(fraction, /border-accent/);
  assert.doesNotMatch(fraction, /indigo-/);
});
