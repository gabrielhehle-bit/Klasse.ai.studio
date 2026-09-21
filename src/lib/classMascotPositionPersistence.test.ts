import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeClassMascotPosition } from './classMascot';
import { initialAppState, switchClassState, syncActiveClass } from './appState';

test('Freies Maskottchen behält seinen Anker auch neben Rand, ehemaliger Tabuzone und großen alten Widgetkarten', () => {
  assert.deepEqual(sanitizeClassMascotPosition(73, 69), { x: 73, y: 69 });
  assert.deepEqual(sanitizeClassMascotPosition(5, 7), { x: 5, y: 7 });
  assert.deepEqual(sanitizeClassMascotPosition(-4, 125), { x: 0, y: 100 });
  assert.deepEqual(sanitizeClassMascotPosition(NaN, Infinity), { x: 50, y: 50 });
  const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(source, /if \(w\.type === "pet"\) \{[\s\S]{0,320}sanitizeClassMascotPosition\(x, y\)/);
  assert.match(source, /const sanitized = rawSanitized\.map\(\(w\) => \{[\s\S]{0,200}if \(w\.type === "pet"\) return w;/);
  assert.match(source, /mascotPortalTarget=\{mascotPortalTarget\}/);
  assert.doesNotMatch(source, /createPortal\(widgetNode, document\.body\)/);
});

test('Die gespeicherte Position gehört zur Klasse und bleibt beim Klassenwechsel erhalten', () => {
  const classroomA = { id: 'A', name: 'A', schuljahr: '2026/27', stufe: 1, schueler: [] } as any;
  const classroomB = { id: 'B', name: 'B', schuljahr: '2026/27', stufe: 1, schueler: [] } as any;
  const mascot = { id: 'widget-pet', type: 'pet', x: 76, y: 68, w: 44, h: 66, visible: true };
  const saved = syncActiveClass({
    ...initialAppState,
    activeClassId: 'A',
    klassenbezeichnung: 'A',
    classes: [classroomA, classroomB],
    cockpitLayout: [mascot] as any,
  });
  const other = switchClassState(saved, 'B');
  const restored = switchClassState(other, 'A');
  const position = restored.cockpitLayout?.find(widget => widget.type === 'pet');
  assert.deepEqual(position && { x: position.x, y: position.y }, { x: 76, y: 68 });
});

test('Auf Smartboard und Maus wird dieselbe eingerastete Position nur einmal gespeichert', () => {
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.match(host, /let lastSnappedPosition: string \| null = null;/);
  assert.match(host, /if \(snappedPosition === lastSnappedPosition\) return;/);
  assert.match(host, /lastSnappedPosition = snappedPosition;/);
});

test('Maskottchen bleibt als freigestellte Figur ohne schwebende Schnellzentrale', () => {
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(widget, /class-mascot-freestanding pointer-events-none/);
  assert.match(css, /\.cockpit-widget-container\.cockpit-free-mascot/);
  assert.match(css, /background-color: transparent !important/);
  assert.match(css, /\.cockpit-free-mascot svg\.class-mascot-painted-artwork/);
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /<UnifiedFAB\s*\/>|<VoiceCommander\s*\/>/);
});
