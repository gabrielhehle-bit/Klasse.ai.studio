import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { initialAppState } from './appState';
import { DEFAULT_CLASS_MASCOT } from './classMascot';

test('Mascot alone is portaled to the entire cockpit root, not bound to the white writing area', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(cockpit, /ref=\{outerContainerRef\}/);
  assert.match(cockpit, /id="widget-board-stage"/);
  assert.match(cockpit, /mascotStageRef=\{outerContainerRef\}/);
  assert.match(cockpit, /mascotPortalTarget=\{mascotPortalTarget\}/);
  assert.match(host, /const activeStageRef = isFreeMascot && mascotStageRef \? mascotStageRef : stageRef/);
  assert.match(host, /isFreeMascot \? \(mascotPortalTarget \? createPortal\(widgetNode, mascotPortalTarget\) : null\) : widgetNode/);
  assert.match(host, /zIndex: isFreeMascot \? 120/);
  // Everything else still uses the original stageRef, never a global document.body.
  assert.match(host, /mascotPortalTarget\?: HTMLElement \| null;/);
  assert.doesNotMatch(host, /createPortal\(widgetNode, document\.body\)/);
});

test('Mascot uses character-sized hit area, viewport bounds and saved class-local x/y', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  const art = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
  }));
  assert.match(host, /normalizeClassMascot\(app\.classMascot\)\.displaySize/);
  assert.match(host, /Math\.min\(mascotSize, stageSize\.width \|\| mascotSize, stageSize\.height \|\| mascotSize\)/);
  assert.match(host, /width: isFreeMascot \? `\$\{mascotPixels\}px`/);
  assert.match(host, /height: isFreeMascot \? `\$\{mascotPixels\}px`/);
  assert.match(host, /const originX = \(renderedX \/ 100\) \* stageRect\.width/);
  assert.match(host, /const originY = \(renderedY \/ 100\) \* stageRect\.height/);
  assert.match(host, /const stage = activeStageRef\.current/);
  assert.match(host, /onUpdate\(\{ x: \(nextX \/ stageRect\.width\) \* 100, y: \(nextY \/ stageRect\.height\) \* 100 \}\)/);
  assert.match(art, /class-mascot-freestanding pointer-events-none/);
  assert.match(art, /class-mascot-character pointer-events-auto/);
  assert.doesNotMatch(art, /class-mascot-details|class-mascot-settings|floating-classpet-outer/);
});

test('Mascot movement obeys layout lock and keyboard accessibility in full-cockpit mode', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(host, /if \(!isFreeMascot \|\| layoutLocked \|\| isMaximized/);
  assert.match(host, /const step = event\.shiftKey \? 1 : 10/);
  assert.match(host, /const x = Math\.max\(0, Math\.min\(stageRect\.width - width, \(renderedX \/ 100\)/);
  assert.match(host, /const y = Math\.max\(0, Math\.min\(stageRect\.height - height, \(renderedY \/ 100\)/);
});
