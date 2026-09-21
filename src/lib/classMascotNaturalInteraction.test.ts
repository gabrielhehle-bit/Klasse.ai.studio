import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { DEFAULT_CLASS_MASCOT } from './classMascot';
import { initialAppState } from './appState';

test('Freistehendes Maskottchen: Figur direkt verschieben, kurzes Tippen öffnet weiter Aktionen', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(host, /handleMascotPointerDown/);
  assert.match(host, /\.closest<HTMLButtonElement>\('\.class-mascot-character'\)/);
  assert.match(host, /Math\.hypot\(dx, dy\) < 9/);
  assert.match(host, /setPointerCapture\(pointerId\)/);
  assert.match(host, /onUpdate\(\{ x: \(nextX \/ stageRect\.width\) \* 100, y: \(nextY \/ stageRect\.height\) \* 100 \}\)/);
  assert.match(host, /onClickCapture=\{isFreeMascot \? handleMascotClickCapture/);
  assert.match(host, /event\.stopPropagation\(\)/);
  assert.match(host, /layoutLocked \|\| isMaximized/);
});

test('Die Figur bleibt ohne Kartenhintergrund und der Werkzeugstreifen erscheint auf Touch erst bei Fokus', () => {
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(css, /\.cockpit-free-mascot:focus-within \.mascot-widget-toolbar/);
  assert.match(css, /\.cockpit-free-mascot:focus-within \.mascot-widget-resize/);
  assert.match(css, /opacity: 0 !important;\s*pointer-events: none;/);
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(widget, /class-mascot-character[^"]*touch-none cursor-grab/);
  assert.match(widget, /ziehen zum Verschieben/);
  assert.match(widget, /maxWidth: settingsOpen \? 170 : detailsOpen \? 220 : 280/);
  const rendered = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
    setApp: () => undefined,
  }));
  assert.match(rendered, /class-mascot-freestanding/);
  assert.match(rendered, /cursor-grab/);
  assert.doesNotMatch(rendered, /class-mascot-details|fixed bottom-|floating-classpet-outer/);
});
