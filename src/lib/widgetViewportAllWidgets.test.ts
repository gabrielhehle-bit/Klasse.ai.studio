import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getWidgetViewportDensity,
  getLegacyWidgetPadding,
  WIDGET_VIEWPORT_OVERFLOW,
} from './widgetViewport';

const frame = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
const board = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const stylesheet = readFileSync('src/index.css', 'utf8');

test('All cockpit widget types share measured INNER viewport; legacy layout remains in the renderer', () => {
  const knownTypes = board.slice(board.indexOf('const knownTypes = ['), board.indexOf('];', board.indexOf('const knownTypes = [')));
  const types = [...knownTypes.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert.ok(types.length >= 111);
  assert.equal(new Set(types).size, types.length);
  assert.match(frame, /ref=\{contentViewportRef\}/);
  assert.match(frame, /observer\.observe\(viewport\)/);
  assert.match(frame, /data-widget-content=\{widget\.type\}/);
  assert.match(frame, /data-widget-density=\{viewportDensity\}/);
  assert.match(frame, /!WIDGET_MIN_SIZES\[widget\.type\]/);
  assert.match(frame, /overflow: WIDGET_VIEWPORT_OVERFLOW/);
  assert.equal(WIDGET_VIEWPORT_OVERFLOW, 'auto');
  assert.doesNotMatch(frame, /className="absolute inset-0 flex flex-col overflow-auto no-scrollbar"/,
    'A hidden scrollbar made overfull legacy content undiscoverable.');
});

test('Density uses the actual widget width AND height without shrinking unmounted content', () => {
  assert.equal(getWidgetViewportDensity(0, 0), 'comfortable');
  assert.equal(getWidgetViewportDensity(NaN, Infinity), 'comfortable');
  assert.equal(getWidgetViewportDensity(320, 900), 'tight');
  assert.equal(getWidgetViewportDensity(850, 210), 'tight');
  assert.equal(getWidgetViewportDensity(480, 300), 'compact');
  assert.equal(getWidgetViewportDensity(900, 330), 'compact');
  assert.equal(getWidgetViewportDensity(960, 610), 'comfortable');
  assert.ok(getLegacyWidgetPadding(320, 220) < getLegacyWidgetPadding(460, 300));
  assert.ok(getLegacyWidgetPadding(460, 300) < getLegacyWidgetPadding(960, 610));
});

test('All widget roots gain flexible width and compact SPACE, but not a global tiny touch-target transform', () => {
  assert.match(stylesheet, /UNIVERSAL COCKPIT SPACE RULES/);
  assert.match(stylesheet, /\.cockpit-widget-content > :is\(div, section, article, main\)/);
  assert.match(stylesheet, /@container \(max-width: 535px\)/);
  assert.match(stylesheet, /@container \(max-width: 345px\)/);
  assert.match(stylesheet, /\[data-widget-density="tight"\]/);
  assert.match(stylesheet, /font-size: clamp\(12px,/);
  assert.doesNotMatch(stylesheet.slice(stylesheet.indexOf('UNIVERSAL COCKPIT SPACE RULES')),
    /transform:\s*scale\(/);
  assert.match(frame, /transform: `scale\(\$\{contentScale\}\)`/,
    'Legacy-rendered widgets must keep their saved scale until individually migrated.');
});
