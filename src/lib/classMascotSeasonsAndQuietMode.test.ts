import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { accountSyncState } from './accountSyncService';
import { initialAppState, syncActiveClass } from './appState';
import { DEFAULT_CLASS_MASCOT, normalizeClassMascot, type ClassMascotSeason } from './classMascot';

const seasons: ClassMascotSeason[] = ['none', 'spring', 'summer', 'autumn', 'winter'];

test('Jahreszeiten werden bewusst gewählt, klassenlokal normalisiert und im Konto-Datenstand synchronisiert', () => {
  assert.equal(normalizeClassMascot().season, 'none');
  assert.equal(normalizeClassMascot({ season: 'invalid' as ClassMascotSeason }).season, 'none');
  assert.equal(normalizeClassMascot().quietMode, false);
  assert.equal(normalizeClassMascot({ quietMode: 'true' as unknown as boolean }).quietMode, false);
  for (const season of seasons) {
    for (const quietMode of [true, false]) {
      const mascot = { ...DEFAULT_CLASS_MASCOT, season, quietMode };
      assert.equal(normalizeClassMascot(mascot).season, season);
      assert.equal(normalizeClassMascot(mascot).quietMode, quietMode);
      const app = syncActiveClass({
        ...initialAppState,
        activeClassId: 'dummy-class',
        klassenbezeichnung: 'Demo',
        classes: [{ id: 'dummy-class', name: 'Demo', stufe: 1, schueler: [] } as any],
        classMascot: mascot,
      });
      const synced = accountSyncState(app);
      assert.equal(synced.classes[0].classMascot?.season, season);
      assert.equal(synced.classes[0].classMascot?.quietMode, quietMode);
    }
  }
});

test('Jede Figur bleibt bei jeder Jahreszeit freistehend; Saisonakzent besteht ausschließlich aus SVG', () => {
  for (const kind of ['otter', 'dog', 'cat', 'elf'] as const) {
    for (const season of seasons) {
      const art = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
        kind, mood: 'happy', name: 'Testfigur', season, accessory: 'none',
      }));
      assert.match(art, new RegExp('data-mascot-kind="' + kind + '"'));
      assert.match(art, new RegExp('data-mascot-season="' + season + '"'));
      if (season === 'none') assert.doesNotMatch(art, /data-mascot-season-accent/);
      else assert.match(art, new RegExp('data-mascot-season-accent="' + season + '"'));
      assert.doesNotMatch(art, /<image\b|<foreignObject\b|https?:\/\/|class-mascot-details|class-mascot-settings/);
    }
  }
});

test('Tafelruhe schaltet alle kurzzeitigen Reaktionen ab, ohne Verschieben oder Einstellungen zu verlieren', () => {
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  const settings = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  assert.match(widget, /if \(state\.quietMode\) return;/);
  assert.match(widget, /\[app\.activeClassId, state\.quietMode\]/);
  assert.match(widget, /animationEnabled=\{state\.animationEnabled && !state\.quietMode\}/);
  assert.match(widget, /reactionActive=\{reactionActive && !state\.quietMode\}/);
  assert.match(widget, /surpriseActive=\{surpriseActive && !state\.quietMode\}/);
  assert.match(widget, /ritualAction=\{state\.quietMode \? null : ritualAction\}/);
  assert.match(settings, /checked=\{normalizeClassMascot\(app\.classMascot\)\.quietMode === true\}/);
  assert.match(settings, /disabled=\{normalizeClassMascot\(app\.classMascot\)\.quietMode\}/);
  assert.match(settings, /Jahreszeit des Klassenmaskottchens/);
  assert.match(settings, /season: item\.season/);
  assert.doesNotMatch(widget, /setApp\(|localStorage|sessionStorage|fetch\(/);
  const board = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: {
      ...initialAppState,
      classMascot: { ...DEFAULT_CLASS_MASCOT, quietMode: true, animationEnabled: true, season: 'winter' },
    },
  }));
  assert.match(board, /class-mascot-freestanding pointer-events-none/);
  assert.match(board, /data-mascot-season-accent="winter"/);
  assert.doesNotMatch(board, /class-mascot-idle|class-mascot-react-otter|data-mascot-surprise|data-mascot-ritual/);
  assert.match(board, /Klassenmaskottchen in Tafelruhe; verschieben/);
});
