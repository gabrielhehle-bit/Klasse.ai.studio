import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const clock = readFileSync('src/components/cockpit/widgets/ClockWidget.tsx', 'utf8');
const help = readFileSync('src/lib/helpContent.ts', 'utf8');
const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

test('Uhr nutzt die gemeinsame Akzentlogik und keine feste Markenfarbe', () => {
  assert.match(clock, /bg-accent text-accent-text border-accent/);
  assert.match(clock, /bg-accent-soft border-accent text-accent/);
  assert.doesNotMatch(clock, /indigo-/);
});

test('Uhr behält kompakt eine gewählte Analoguhr', () => {
  assert.match(clock, /resolveClockMode\(settings\.mode, isCompact\)/);
  assert.doesNotMatch(clock, /isCompact \? 'digital' : settings\.mode/);
});

test('Uhr bleibt kompakt, touch-sicher und ohne doppelten Innentitel', () => {
  assert.match(frame, /clock: \{ w: 25, h: 28 \}/);
  assert.match(clock, /w-11 h-11 flex items-center justify-center rounded-xl/);
  assert.match(clock, /w-full h-11 rounded-xl bg-accent/);
  assert.doesNotMatch(clock, /<h[1-6][^>]*>\s*Uhrzeit & Datum\s*<\/h[1-6]>/);
  assert.doesNotMatch(clock, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
});

test('Uhr-Einstellungen sind als Dialog ausgezeichnet und die Hilfe ist vollständig', () => {
  assert.match(clock, /role="dialog"[\s\S]*aria-label="Uhr-Einstellungen"/);
  assert.match(help, /clock: \['Öffne im Lehrercockpit „Widget hinzufügen“ → „Uhrzeit & Datum“/);
  assert.match(help, /„Digital“, „Analog“ oder „Beides“/);
  assert.match(help, /Standby/);
  assert.match(help, /Jänner/);
});
