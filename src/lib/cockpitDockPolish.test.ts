import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dock = readFileSync('src/components/cockpit/CockpitWidgetDock.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('Widget-Dock bleibt bei vielen Favoriten kompakt und ohne abgeschnittene Beschriftungen', () => {
  assert.match(dock, /favorites\.length <= 5/);
  assert.match(dock, /klassio-dock-favorites/);
  assert.match(dock, /\[scrollbar-width:none\]/);
  assert.match(dock, /aria-label="Werkzeuge"/);
  assert.match(dock, /Widget-Bibliothek öffnen/);
});

test('Widget-Dock nutzt eine einheitliche Icon-Sprache für Systemaktionen', () => {
  assert.match(dock, /LayoutGrid/);
  assert.match(dock, /Settings2/);
  assert.match(dock, /PawPrint/);
  assert.match(dock, /UsersRound/);
  assert.doesNotMatch(dock, /}>⚙️<\/button>/);
  assert.doesNotMatch(dock, /}>🐾<\/button>/);
  assert.doesNotMatch(dock, /}>👥<\/button>/);
});

test('Widget-Dock blendet die horizontale Browser-Scrollbar aus', () => {
  assert.match(css, /\.klassio-dock-favorites::-webkit-scrollbar/);
  assert.match(css, /scrollbar-width: none/);
  assert.match(css, /\.klassio-dock-system/);
});
