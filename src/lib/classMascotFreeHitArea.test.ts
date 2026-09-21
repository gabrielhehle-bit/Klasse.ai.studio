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
  assert.match(styles, /\.cockpit-free-mascot \.class-mascot-character,[\s\S]{0,200}\.cockpit-free-mascot \.class-mascot-settings \{\s*pointer-events: auto;/);
  assert.match(styles, /\.cockpit-free-mascot \.mascot-widget-toolbar,[\s\S]{0,100}\.mascot-widget-resize \{\s*visibility: hidden;\s*pointer-events: none;/);
  assert.match(styles, /\.cockpit-free-mascot:focus-within \.mascot-widget-toolbar/);
  assert.match(styles, /\.cockpit-free-mascot\[data-mascot-focused="true"\] \.mascot-widget-toolbar/);
  assert.match(widget, /class-mascot-freestanding pointer-events-none/);
  assert.match(widget, /class-mascot-character pointer-events-auto mx-auto/);
  assert.match(widget, /style=\{\{ width: 'min\(100%, 280px\)' \}\}/);
});

test('Das freigestellte Maskottchen ist per Tastatur und kurzem Tippen bedienbar; Aktionen bleiben geschlossen', () => {
  const markup = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
    setApp: () => undefined,
  }));
  assert.match(markup, /aria-label="Klassenmaskottchen"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /class-mascot-character pointer-events-auto/);
  assert.match(markup, /role="img"/);
  assert.doesNotMatch(markup, /class-mascot-details|class-mascot-settings|fixed bottom-|floating-classpet-outer/);
});
