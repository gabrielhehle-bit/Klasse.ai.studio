import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { accountSyncState } from './accountSyncService';
import { initialAppState, syncActiveClass } from './appState';
import {
  DEFAULT_CLASS_MASCOT, MASCOT_SURPRISE_EVENT, normalizeClassMascot,
  type ClassMascotAccessory, type ClassMascotKind,
} from './classMascot';

const kinds: ClassMascotKind[] = ['otter', 'dog', 'cat', 'elf'];
const outfits: ClassMascotAccessory[] = ['none', 'scarf', 'glasses', 'star'];

test('Four original surprise props remain inside transparent SVG, never download external assets', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const settings = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(widget, /onClick=\{reactToTap\}/);
  assert.match(widget, /onDoubleClick=\{triggerSurprise\}/);
  assert.match(widget, /surpriseTimer\.current = setTimeout/);
  assert.match(widget, /window\.addEventListener\(MASCOT_SURPRISE_EVENT, triggerSurprise\)/);
  assert.match(settings, /window\.dispatchEvent\(new Event\(MASCOT_SURPRISE_EVENT\)\)/);
  assert.match(css, /class-mascot-surprise \{ animation: none !important;/);
  assert.doesNotMatch(widget, /setApp\(|Audio\(|speechSynthesis/);
  assert.equal(MASCOT_SURPRISE_EVENT, 'klassio:mascot-surprise');
  for (const kind of kinds) {
    const idle = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind, mood: 'happy', name: 'Demo',
    }));
    const triggered = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind, mood: 'happy', name: 'Demo', surpriseActive: true, surpriseTick: 2,
    }));
    assert.doesNotMatch(idle, /data-mascot-surprise/);
    assert.match(triggered, new RegExp('data-mascot-surprise="' + kind + '"'));
    assert.match(triggered, /pointer-events="none"/);
    assert.doesNotMatch(triggered, /<image\b|<foreignObject\b|https?:\/\//);
  }
});

test('Outfits are class-local, sanitized and roundtrip via complete encrypted account snapshot', () => {
  assert.equal(normalizeClassMascot().accessory, 'none');
  assert.equal(normalizeClassMascot({ accessory: 'bad' as any }).accessory, 'none');
  for (const accessory of outfits) {
    assert.equal(normalizeClassMascot({ accessory }).accessory, accessory);
    const app = syncActiveClass({
      ...initialAppState,
      activeClassId: 'demo-class',
      klassenbezeichnung: 'Demo',
      classes: [{
        id: 'demo-class', name: 'Demo', stufe: 1, klassenvorstand: true, schueler: [],
      } as any],
      classMascot: { ...DEFAULT_CLASS_MASCOT, accessory },
    });
    assert.equal(accountSyncState(app).classes[0].classMascot?.accessory, accessory);
    const art = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind: 'cat', mood: 'happy', name: 'Mimi', accessory,
    }));
    assert.match(art, new RegExp('data-mascot-accessory="' + accessory + '"'));
    if (accessory === 'none') assert.doesNotMatch(art, /data-mascot-outfit/);
    else assert.match(art, new RegExp('data-mascot-outfit="' + accessory + '"'));
  }
  const board = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: { ...DEFAULT_CLASS_MASCOT, accessory: 'scarf' } },
  }));
  assert.match(board, /data-mascot-outfit="scarf"/);
  assert.match(board, /class-mascot-freestanding pointer-events-none/);
  assert.doesNotMatch(board, /class-mascot-details|class-mascot-settings|floating-classpet-outer/);
});
