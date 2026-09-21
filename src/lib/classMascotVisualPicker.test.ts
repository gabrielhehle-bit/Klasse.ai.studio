import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import { MASCOT_OPTIONS } from './classMascot';

test('Alle vier Figuren besitzen eigene transparente Vorschauen, ohne Fremd-Assets oder Hintergrundbild', () => {
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(widget, /MASCOT_OPTIONS\.map\(option => \(/);
  assert.match(widget, /<ClassMascotArtwork kind=\{option\.kind\} mood="happy" name=\{option\.name\} animationEnabled=\{false\} \/>/);
  assert.match(widget, /aria-hidden="true"/);
  assert.match(widget, /aria-pressed=\{state\.kind === option\.kind\}/);
  assert.match(widget, /✓ Ausgewählt/);
  const artworks = new Map<string, string>();
  for (const option of MASCOT_OPTIONS) {
    const html = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind: option.kind, mood: 'happy', name: option.name, animationEnabled: false,
    }));
    assert.match(html, new RegExp('data-mascot-kind="' + option.kind + '"'));
    assert.match(html, /role="img"/);
    assert.doesNotMatch(html, /<image\b|<foreignObject\b|background-image|<iframe\b/);
    artworks.set(option.kind, html);
  }
  assert.equal(artworks.size, 4);
  assert.equal(new Set(artworks.values()).size, 4, 'Each selectable character has its own illustration.');
});

test('Hauself Elio behält eigene Augen, Ohren, Schulweste und warmen Hautton', () => {
  const source = readFileSync('src/components/cockpit/ClassMascotArtwork.tsx', 'utf8');
  assert.match(source, /elf: \{ fur: '#BDB9A2'/);
  assert.match(source, /woodland-school helper/);
  assert.match(source, /kind === 'elf'/);
  assert.match(source, /book-shaped brooch/);
  assert.doesNotMatch(source, /Dobby|Harry Potter|Hogwarts/);
});
