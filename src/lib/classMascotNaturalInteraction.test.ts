import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { DEFAULT_CLASS_MASCOT } from './classMascot';
import { initialAppState } from './appState';

test('Freistehendes Maskottchen: Figur direkt verschieben, Tippen öffnet keine Aktionen', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(host, /handleMascotPointerDown/);
  assert.match(host, /\.closest<HTMLButtonElement>\('\.class-mascot-character'\)/);
  assert.match(host, /Math\.hypot\(dx, dy\) < 9/);
  assert.match(host, /setPointerCapture\(pointerId\)/);
  assert.match(host, /onUpdate\(\{ x: \(nextX \/ stageRect\.width\) \* 100, y: \(nextY \/ stageRect\.height\) \* 100 \}\)/);
  assert.match(host, /onClickCapture=\{isFreeMascot \? handleMascotClickCapture/);
  assert.match(host, /data-mascot-focused=\{isFreeMascot && isFocused/);
  assert.match(host, /event\.stopPropagation\(\)/);
  assert.match(host, /layoutLocked \|\| isMaximized/);
});

test('Die Figur bleibt ohne Kartenhintergrund; Werkzeugstreifen und Namenszeile sind dauerhaft ausgeblendet', () => {
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(css, /\.cockpit-free-mascot \.mascot-widget-resize \{\s*display: none !important;/);
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(widget, /class-mascot-character[^"]*touch-none cursor-grab/);
  assert.match(widget, /Klassenmaskottchen verschieben/);
  assert.doesNotMatch(widget, /title="Maskottchen|onClick=|setDetailsOpen/);
  assert.doesNotMatch(widget, /setDetailsOpen|setSettingsOpen|class-mascot-name|class-mascot-details|class-mascot-settings/);
  const rendered = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
    setApp: () => undefined,
  }));
  assert.match(rendered, /class-mascot-freestanding/);
  assert.match(rendered, /cursor-grab/);
  assert.doesNotMatch(rendered, /class-mascot-name|class-mascot-details|class-mascot-settings|aria-expanded|fixed bottom-|floating-classpet-outer/);
});
