import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { initialAppState } from './appState';
import { DEFAULT_CLASS_MASCOT, MASCOT_OPTIONS } from './classMascot';

test('Vier originelle Maskottchen blinzeln bzw. bewegen ihren Schwanz ausschließlich bei eingeschalteter Animation', () => {
  for (const option of MASCOT_OPTIONS) {
    const enabled = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind: option.kind, name: option.name, mood: 'happy', animationEnabled: true,
    }));
    const disabled = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind: option.kind, name: option.name, mood: 'happy', animationEnabled: false,
    }));
    assert.match(enabled, /class-mascot-eye-blink/);
    assert.match(enabled, /class-mascot-idle/);
    assert.doesNotMatch(disabled, /class-mascot-eye-blink|class-mascot-tail-sway|class-mascot-idle/);
    if (option.kind !== 'elf') assert.match(enabled, /class-mascot-tail-sway/);
    assert.doesNotMatch(enabled, /floating-classpet-outer|class-mascot-details|class-mascot-settings/);
  }
  const asleep = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
    kind: 'elf', name: 'Elio', mood: 'sleepy', animationEnabled: true,
  }));
  assert.doesNotMatch(asleep, /class-mascot-eye-blink/);
});

test('Reduzierte Bewegung schaltet auch Blinzeln und Schwanzbewegung vollständig aus', () => {
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(css, /@keyframes class-mascot-blink/);
  assert.match(css, /@keyframes class-mascot-tail-wiggle/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.class-mascot-idle,\s*\.class-mascot-eye-blink,\s*\.class-mascot-tail-sway \{ animation: none !important; \}/);
});

test('Die Figur bleibt freistehend und lässt sich ohne sichtbare Extra-Bedienung per Pfeiltasten bewegen', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(host, /handleMascotKeyDown/);
  assert.match(host, /onKeyDown=\{isFreeMascot \? handleMascotKeyDown : undefined\}/);
  assert.match(host, /target\.closest\('\.class-mascot-character'\)/);
  assert.match(host, /if \(!isFreeMascot \|\| layoutLocked \|\| isMaximized\) return;/);
  assert.match(host, /const step = event\.shiftKey \? 1 : 10;/);
  const html = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
  }));
  assert.match(html, /Klassenmaskottchen verschieben: ziehen oder Pfeiltasten nutzen/);
  assert.match(html, /class-mascot-freestanding pointer-events-none/);
  assert.doesNotMatch(html, /class-mascot-details|class-mascot-settings|floating-classpet-outer/);
});
