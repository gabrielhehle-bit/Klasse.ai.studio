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
const actions: ClassMascotAction[] = ['praise', 'calm', 'encourage', 'greet', 'move', 'ready'];

test('Every KLASSIO mascot performs teacher-controlled classroom rituals as transparent SVG', () => {
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
  const host = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');
  assert.equal(MASCOT_RITUAL_EVENT, 'klassio:mascot-class-ritual');
  for (const action of actions) assert.equal(isClassMascotAction(action), true);
  for (const untrusted of ['unknown', null, undefined, {}, 23, 'praises']) {
    assert.equal(isClassMascotAction(untrusted), false);
  }
  assert.match(widget, /window\.addEventListener\(MASCOT_RITUAL_EVENT, triggerRitual\)/);
  assert.match(widget, /window\.removeEventListener\(MASCOT_RITUAL_EVENT, triggerRitual\)/);
  assert.match(widget, /if \(!isClassMascotAction\(action\)\) return;/);
  assert.match(widget, /setRitualAction\(null\)/);
  assert.match(widget, /\[app\.activeClassId, state\.quietMode, stopRitual\]/);
  assert.match(host, /window\.dispatchEvent\(new CustomEvent\(MASCOT_RITUAL_EVENT, \{ detail: action \}\)\)/);
  assert.match(host, /reactToMascotAction\(current, action\)/);
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

test('Silent activities need neither a cue card nor a timer', () => {
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.doesNotMatch(widget, /data-mascot-cue|role="timer"|setInterval|cueClock|Ritual pausieren/);
  for (const action of ['greet', 'move', 'ready', 'read', 'tidy', 'reflect'] as const) {
    assert.equal(isClassMascotAction(action), true);
    assert.strictEqual(reactToMascotAction(DEFAULT_CLASS_MASCOT, action), DEFAULT_CLASS_MASCOT);
  }
  const art = (action: ClassMascotAction) => renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
    kind: 'otter', mood: 'happy', name: 'Olivia', ritualAction: action,
  }));
  assert.match(art('read'), /data-mascot-reading-book/);
  assert.match(art('tidy'), /data-mascot-ritual-accent="tidy"/);
});

test('Mimi shows three reading poses without idle motion and the book belongs to Mimi', () => {
  for (const phase of ['ready', 'reading', 'finished'] as const) {
    const props = { kind: 'cat' as const, mood: 'happy' as const, name: 'Mimi',
      animationEnabled: true, reactionActive: true, ritualAction: 'read' as const, readingPhase: phase };
    const mimi = renderToStaticMarkup(React.createElement(ClassMascotArtwork, props));
    assert.match(mimi, new RegExp('data-mimi-reading="' + phase + '"'));
    assert.match(mimi, new RegExp('data-mimi-book="' + (phase === 'reading' ? 'open' : 'closed') + '"'));
    assert.doesNotMatch(mimi, /class-mascot-idle|class-mascot-tail-sway|class-mascot-react-cat/);
    const bruno = renderToStaticMarkup(React.createElement(ClassMascotArtwork, { ...props, kind: 'dog', name: 'Bruno' }));
    assert.doesNotMatch(bruno, /data-mimi-reading|data-mimi-book/);
  }
});
