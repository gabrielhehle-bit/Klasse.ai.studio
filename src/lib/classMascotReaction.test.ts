import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { initialAppState } from './appState';
import { DEFAULT_CLASS_MASCOT, type ClassMascotKind } from './classMascot';

test('Jede Figur hat eine eigene kurze Reaktion, ohne Karte, Audio oder dauerhafte Eigenbewegung', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  const artwork = readFileSync('src/components/cockpit/ClassMascotArtwork.tsx', 'utf8');
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(widget, /onClick=\{reactToTap\}/);
  assert.match(widget, /setReactionActive\(false\)/);
  assert.match(widget, /reactionTick=\{reactionTick\}/);
  assert.doesNotMatch(widget, /setApp\(|Audio\(|speechSynthesis|new Image\(/);
  assert.match(host, /onClickCapture=\{isFreeMascot \? handleMascotClickCapture/);
  assert.match(host, /suppressMascotTap\.current = true/);
  for (const kind of ['otter', 'dog', 'cat', 'elf'] as const) {
    const markup = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind, mood: 'happy', name: 'Demo', animationEnabled: false, reactionActive: true, reactionTick: 1,
    }));
    assert.match(markup, new RegExp('class-mascot-react-' + kind));
    assert.match(css, new RegExp('\\.class-mascot-react-' + kind));
    assert.match(artwork, new RegExp("kind === '" + kind + "'"));
  }
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /class-mascot-tail-reaction \{\s*animation: none !important;/);
  const idleMarkup = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
  }));
  assert.match(idleMarkup, /class-mascot-freestanding pointer-events-none/);
  assert.doesNotMatch(idleMarkup, /class-mascot-react-otter|class-mascot-details|class-mascot-settings/);
});
