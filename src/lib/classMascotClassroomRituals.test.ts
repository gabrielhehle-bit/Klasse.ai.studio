import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import ClassMascotWidget from '../components/cockpit/ClassMascotWidget';
import { initialAppState } from './appState';
import {
  DEFAULT_CLASS_MASCOT, isClassMascotAction, MASCOT_RITUAL_EVENT,
  reactToMascotAction, type ClassMascotAction, type ClassMascotKind,
} from './classMascot';

const kinds: ClassMascotKind[] = ['otter', 'dog', 'cat', 'elf'];
const actions: ClassMascotAction[] = ['praise', 'calm', 'encourage'];

test('Every KLASSIO mascot performs three short, teacher-controlled classroom rituals as transparent SVG', () => {
  const artwork = readFileSync('src/components/cockpit/ClassMascotArtwork.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');
  for (const kind of kinds) {
    const idle = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind, mood: 'happy', name: 'Demo', animationEnabled: false,
    }));
    assert.doesNotMatch(idle, /data-mascot-ritual/);
    for (const action of actions) {
      const markup = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
        kind, mood: 'happy', name: 'Demo', ritualAction: action, ritualTick: 4,
      }));
      assert.match(markup, new RegExp('data-mascot-kind="' + kind + '"'));
      assert.match(markup, new RegExp('data-mascot-ritual="' + action + '"'));
      assert.match(markup, new RegExp('class-mascot-ritual-' + action));
      assert.doesNotMatch(markup, /<image\b|<foreignObject\b|https?:\/\/|class-mascot-details|floating-classpet-outer/);
      assert.match(css, new RegExp('class-mascot-ritual-' + action));
    }
  }
  assert.match(artwork, /data-mascot-ritual-accent="praise"/);
  assert.match(artwork, /data-mascot-ritual-accent="encourage"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?class-mascot-ritual-accent \{ animation: none !important; \}/);
});

test('Teacher menu triggers local gesture while only conscious mood changes the encrypted AppState', () => {
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  const settings = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  assert.equal(MASCOT_RITUAL_EVENT, 'klassio:mascot-class-ritual');
  for (const action of actions) assert.equal(isClassMascotAction(action), true);
  for (const untrusted of ['unknown', null, undefined, {}, 23, 'praises']) {
    assert.equal(isClassMascotAction(untrusted), false);
  }
  assert.match(widget, /window\.addEventListener\(MASCOT_RITUAL_EVENT, triggerRitual\)/);
  assert.match(widget, /window\.removeEventListener\(MASCOT_RITUAL_EVENT, triggerRitual\)/);
  assert.match(widget, /if \(!isClassMascotAction\(action\)\) return;/);
  assert.match(widget, /setRitualAction\(null\)/);
  assert.match(widget, /\[app\.activeClassId\]/);
  assert.match(settings, /window\.dispatchEvent\(new CustomEvent\(MASCOT_RITUAL_EVENT, \{ detail: ritual\.action \}\)\)/);
  assert.match(settings, /classMascot: reactToMascotAction\(normalizeClassMascot\(prev\.classMascot\), ritual\.action\)/);
  assert.doesNotMatch(widget, /setApp\(|localStorage|sessionStorage|fetch\(|Audio\(|speechSynthesis/);
  const board = renderToStaticMarkup(React.createElement(ClassMascotWidget, {
    app: { ...initialAppState, classMascot: DEFAULT_CLASS_MASCOT },
  }));
  assert.match(board, /class-mascot-freestanding pointer-events-none/);
  assert.doesNotMatch(board, /data-mascot-ritual|Klassenrituale|class-mascot-settings/);
  const praised = reactToMascotAction(DEFAULT_CLASS_MASCOT, 'praise');
  assert.equal(praised.mood, 'proud');
  assert.equal(reactToMascotAction(DEFAULT_CLASS_MASCOT, 'calm').mood, 'calm');
  assert.equal(reactToMascotAction(DEFAULT_CLASS_MASCOT, 'encourage').mood, 'happy');
  assert.ok(!('ritualAction' in praised) && !('ritualTick' in praised));
});
