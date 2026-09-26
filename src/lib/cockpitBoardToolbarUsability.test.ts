import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

function between(start: string, end: string): string {
  const from = cockpit.indexOf(start);
  const to = cockpit.indexOf(end, from + start.length);
  assert.ok(from >= 0, 'start marker missing: ' + start);
  assert.ok(to > from, 'end marker missing: ' + end);
  return cockpit.slice(from, to);
}

test('Cockpit-Kopfaktionen bleiben mindestens 44px groß und eindeutig beschriftet', () => {
  const toolbar = between(
    '<button type="button" onClick={toggleFullscreen}',
    '{/* Secondary Actions: Dropdown Menu',
  );
  assert.match(toolbar, /min-h-11 min-w-11 rounded-xl/);
  assert.match(toolbar, /aria-label=\{isFullscreen \? "Vollbild beenden" : "Vollbild öffnen"\}/);
  assert.match(toolbar, /aria-label="Vorlage erstellen"/);
  assert.match(toolbar, />Vorlage erstellen<\/span>/);
  assert.doesNotMatch(toolbar, /min-h-10/);

  const optionsTrigger = between(
    '{/* Secondary Actions: Dropdown Menu',
    '{isMoreOptionsMenuOpen &&',
  );
  assert.match(optionsTrigger, /min-h-11 min-w-11/);
  assert.match(optionsTrigger, /aria-label="Weitere Optionen und Layout-Werkzeuge"/);
});

test('Cockpit-Optionen haben eine benannte Menüfläche und keine 40px-Aktionszeilen mehr', () => {
  const options = between(
    'role="menu"\n                                aria-label="Weitere Cockpit-Optionen"',
    '{/* Layout Slot Menu Modal if opened */}',
  );
  assert.match(options, /min-h-11/);
  assert.match(options, /Widget-Leiste anzeigen/);
  assert.match(options, /relative inline-flex min-h-11 min-w-14/);
  assert.match(options, /alle Widgets suchen, hinzufügen, sortieren und sicher entfernen/);
  assert.doesNotMatch(options, /min-h-(?:9|10)/);
});

test('Layout-Slots und Profilaktionen sind touch-sicher', () => {
  const slots = between(
    'role="dialog"\n                                aria-label="Layouts und Schnell-Slots"',
    '{/* Compact start menu for writing tools and paper.',
  );
  assert.match(slots, /aria-label="Layouts und Schnell-Slots schließen"/);
  assert.match(slots, /min-h-11 min-w-11/);
  assert.match(slots, /min-h-11 flex-1 text-\[10px\]/);
  assert.match(slots, /min-h-11 px-2 py-1\.5 rounded-r-md/);
  assert.match(slots, /min-h-11 flex-1 rounded-lg bg-indigo-50\/50/);
  assert.match(slots, /min-h-11 flex-1 rounded-lg bg-emerald-500/);
  assert.match(slots, /min-h-11 flex-1 bg-transparent/);
  assert.match(slots, /min-h-11 w-full px-2 py-1\.5 rounded-xl/);
});

test('Schreiben-und-Papier-Schließen bleibt ebenfalls 44px groß', () => {
  assert.match(cockpit, /aria-label="Schreiben und Papier schließen"[\s\S]{0,180}className="flex h-11 w-11/);
});
