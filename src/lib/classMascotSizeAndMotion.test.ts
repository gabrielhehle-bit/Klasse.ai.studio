import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { initialAppState } from './appState';
import { DEFAULT_CLASS_MASCOT, normalizeClassMascot, selectClassMascot } from './classMascot';

test('Mascot size is migrated and restricted to supported display sizes', () => {
  assert.equal(normalizeClassMascot().displaySize, 220);
  assert.equal(normalizeClassMascot({ displaySize: 160 }).displaySize, 160);
  assert.equal(normalizeClassMascot({ displaySize: 280 }).displaySize, 280);
  assert.equal(normalizeClassMascot({ displaySize: 999 as any }).displaySize, 220);
  assert.equal(selectClassMascot({ ...DEFAULT_CLASS_MASCOT, displaySize: 160 }, 'elf').displaySize, 160);
});

test('Mascot grows and shrinks without acquiring a card, floating overlay or oversized grab target', () => {
  for (const size of [160, 220, 280] as const) {
    const output = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
      app: { ...initialAppState, classMascot: { ...DEFAULT_CLASS_MASCOT, displaySize: size } },
    }));
    assert.match(output, new RegExp('width:min\\(100%, ' + size + 'px\\)'));
    assert.match(output, /class-mascot-character pointer-events-none/);
    assert.match(output, /class-mascot-freestanding pointer-events-none/);
    assert.doesNotMatch(output, /class-mascot-name|class-mascot-details|class-mascot-settings|floating-classpet-outer/);
  }
});

test('Mascot choice, size and reduced-motion-sensitive gentle animation live in design settings only', () => {
  const settings = readFileSync('src/components/UnterrichtsmodusThemePicker.tsx', 'utf8');
  const art = readFileSync('src/components/cockpit/ClassMascotArtwork.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(settings, /Größe auf der Tafel/);
  assert.match(settings, /Maskottchengröße/);
  assert.match(settings, /animationEnabled: event.target.checked/);
  assert.match(settings, /displaySize: option.size/);
  assert.match(art, /class-mascot-idle/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
