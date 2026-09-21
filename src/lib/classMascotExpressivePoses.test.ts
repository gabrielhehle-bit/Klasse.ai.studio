import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import { DEFAULT_CLASS_MASCOT, reactToMascotAction, type ClassMascotKind, type ClassMascotMood } from './classMascot';

const kinds: ClassMascotKind[] = ['otter', 'dog', 'cat', 'elf'];
const postures: Record<ClassMascotMood, string> = {
  happy: 'sit',
  calm: 'settle',
  sleepy: 'rest',
  proud: 'celebrate',
};

test('Vier originelle freigestellte Figuren haben je vier anatomisch verschiedene Stimmungsposen', () => {
  for (const kind of kinds) {
    const outputs = (Object.keys(postures) as ClassMascotMood[]).map(mood =>
      renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
        kind, mood, name: 'Demo', animationEnabled: false,
      })),
    );
    assert.equal(new Set(outputs).size, 4, kind + ': jede Stimmung braucht eine eigene Silhouette');
    for (let i = 0; i < outputs.length; i += 1) {
      const mood = (Object.keys(postures) as ClassMascotMood[])[i];
      const markup = outputs[i];
      assert.match(markup, new RegExp('data-mascot-posture="' + postures[mood] + '"'));
      assert.match(markup, new RegExp('data-mascot-kind="' + kind + '"'));
      assert.doesNotMatch(markup, /<image\b|https?:\/\/|class-mascot-details|class-mascot-settings|floating-classpet-outer/);
      assert.match(markup, /class-mascot-painted-artwork/);
    }
    assert.doesNotMatch(outputs[2], /class-mascot-idle|class-mascot-gaze|class-mascot-ear-twitch/,
      kind + ': ein schlafendes Maskottchen bleibt auch bei opt-in Animation ruhig');
    const movingSleep = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind, mood: 'sleepy', name: 'Demo', animationEnabled: true,
    }));
    assert.doesNotMatch(movingSleep, /class-mascot-idle|class-mascot-gaze|class-mascot-ear-twitch/);
  }
});

test('Die Maskottchenkonfiguration zeigt eine aktuelle Vorschau und kontrollierte Rituale nur im Dialog', () => {
  const settings = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  const board = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  const styles = readFileSync('src/index.css', 'utf8');
  assert.match(settings, /Maskottchenprofil und Klassenrituale/);
  assert.match(settings, /Gemeinsame Klassenrituale/);
  assert.match(settings, /reactToMascotAction\(normalizeClassMascot\(prev\.classMascot\), ritual\.action\)/);
  assert.match(settings, /<ClassMascotArtwork[\s\S]*?mood=\{normalizeClassMascot\(app\.classMascot\)\.mood\}/);
  assert.doesNotMatch(board, /Gemeinsame Klassenrituale|Maskottchenprofil und Klassenrituale/);
  assert.match(styles, /class-mascot-gaze/);
  assert.match(styles, /class-mascot-ear-twitch/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.equal(reactToMascotAction(DEFAULT_CLASS_MASCOT, 'praise').mood, 'proud');
  assert.equal(reactToMascotAction(DEFAULT_CLASS_MASCOT, 'calm').mood, 'calm');
  assert.equal(reactToMascotAction(DEFAULT_CLASS_MASCOT, 'encourage').mood, 'happy');
});
