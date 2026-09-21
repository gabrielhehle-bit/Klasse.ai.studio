import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { initialAppState } from './appState';
import { DEFAULT_CLASS_MASCOT } from './classMascot';

test('Maskottchen steht frei und seine unsichtbare Widgetfläche blockiert keine Cockpit-Klicks', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  const styles = readFileSync('src/index.css', 'utf8');
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(host, /mascot-widget-toolbar absolute inset-x-0 top-0/);
  assert.match(host, /cockpit-free-mascot rounded-none border-0 bg-transparent shadow-none/);
  assert.match(styles, /\.cockpit-widget-container\.cockpit-free-mascot \{\s*pointer-events: none !important;/);
  assert.match(styles, /\.cockpit-free-mascot \.class-mascot-character \{\s*pointer-events: none;/);
  assert.match(styles, /\.cockpit-free-mascot svg\.class-mascot-painted-artwork \{\s*pointer-events: visiblePainted;/);
  assert.match(widget, /<ClassMascotArtwork kind=/);
  const art = readFileSync('src/components/cockpit/ClassMascotArtwork.tsx', 'utf8');
  assert.match(art, /class-mascot-painted-artwork/);
  assert.match(art, /\{kind === 'otter' &&/);
  assert.match(art, /\{kind === 'dog' &&/);
  assert.match(art, /\{kind === 'cat' &&/);
  assert.match(art, /\{kind === 'elf' &&/);
  assert.match(styles, /\.cockpit-free-mascot \.mascot-widget-resize \{\s*display: none !important;/);
  assert.match(widget, /class-mascot-freestanding pointer-events-none/);
  assert.match(widget, /class-mascot-character pointer-events-none mx-auto/);
  assert.match(widget, /style=\{\{ width: `min\(100%, \$\{state\.displaySize\}px\)` \}\}/);
});

test('Das freigestellte Maskottchen lässt sich gezielt greifen, ohne Namenszeile oder Aktionen', () => {
  const markup = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
    setApp: () => undefined,
  }));
  assert.match(markup, /aria-label="Klassenmaskottchen"/);
  assert.doesNotMatch(markup, /aria-expanded|class-mascot-name/);
  assert.match(markup, /class-mascot-character pointer-events-none/);
  assert.match(markup, /role="img"/);
  assert.doesNotMatch(markup, /class-mascot-details|class-mascot-settings|fixed bottom-|floating-classpet-outer/);
});
