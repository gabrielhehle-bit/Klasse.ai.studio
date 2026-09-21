import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initialAppState, switchClassState, syncActiveClass } from './appState';
import { DEFAULT_CLASS_MASCOT, normalizeClassMascot, selectClassMascot } from './classMascot';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';

test('Name und vier Stimmungen lassen sich nur unter Farbe & Design bewusst wählen, ohne neue Tafelbedienelemente', () => {
  const picker = readFileSync('src/components/UnterrichtsmodusThemePicker.tsx', 'utf8');
  assert.match(picker, /id="class-mascot-name"/);
  assert.match(picker, /maxLength=\{24\}/);
  assert.match(picker, /classMascot: \{ \.\.\.normalizeClassMascot\(prev\.classMascot\), name: nextName \}/);
  assert.match(picker, /onBlur=\{\(\) => setApp\(prev => \(\{/);
  assert.match(picker, /Stimmung des Klassenmaskottchens/);
  for (const mood of ['happy', 'calm', 'sleepy', 'proud']) {
    assert.match(picker, new RegExp("mood: '" + mood + "' as const"));
  }
  assert.match(picker, /mood: option\.mood/);
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.doesNotMatch(widget, /<input|Stimmung auswählen|Name des Klassenmaskottchens|class-mascot-settings|class-mascot-details/);
  assert.match(widget, /class-mascot-freestanding pointer-events-none/);
});

test('Eigenname und Stimmung gehören nur zu einer Klasse; ein leeres Feld fällt auf den Originalnamen zurück', () => {
  const elf = selectClassMascot(DEFAULT_CLASS_MASCOT, 'elf');
  const custom = normalizeClassMascot({ ...elf, name: 'Fino', mood: 'sleepy' });
  assert.equal(custom.name, 'Fino');
  assert.equal(custom.mood, 'sleepy');
  assert.equal(normalizeClassMascot({ ...custom, name: '' }).name, 'Elio');
  assert.equal(normalizeClassMascot({ ...custom, name: '   ' }).name, 'Elio');
  assert.equal(normalizeClassMascot({ ...custom, name: 'A'.repeat(30) }).name.length, 24);
  assert.equal(selectClassMascot(custom, 'dog').name, 'Bruno');
  const roomA = { id: 'A', name: 'A', schuljahr: '2026/27', stufe: 1, schueler: [] } as any;
  const roomB = { id: 'B', name: 'B', schuljahr: '2026/27', stufe: 1, schueler: [] } as any;
  const a = syncActiveClass({
    ...initialAppState, activeClassId: 'A', klassenbezeichnung: 'A',
    classes: [roomA, roomB], classMascot: custom,
  });
  assert.equal(a.classes?.[0].classMascot?.name, 'Fino');
  const other = switchClassState(a, 'B');
  assert.equal(other.classMascot, undefined);
  assert.equal(switchClassState(other, 'A').classMascot?.mood, 'sleepy');
});

test('Alle Stimmungen ändern nur das freigestellte Bild und seinen barrierefreien Namen', () => {
  for (const mood of ['happy', 'calm', 'sleepy', 'proud'] as const) {
    const html = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
      app: { ...initialAppState, classMascot: { ...DEFAULT_CLASS_MASCOT, kind: 'elf', name: 'Fino', mood } },
    }));
    assert.match(html, /class-mascot-freestanding/);
    assert.match(html, /Fino/);
    assert.doesNotMatch(html, /class-mascot-name|class-mascot-settings|class-mascot-details|floating-classpet/);
    const art = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind: 'elf', mood, name: 'Fino', animationEnabled: false,
    }));
    assert.match(art, /data-mascot-kind="elf"/);
    assert.match(art, /role="img"/);
  }
});
