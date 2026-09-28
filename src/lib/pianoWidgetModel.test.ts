import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PIANO_WIDGET_SETTINGS,
  PIANO_KEYS,
  getPianoKeyPrimaryLabel,
  getPianoKeySecondaryLabel,
  normalizePianoWidgetSettings,
} from './pianoWidgetModel';

test('piano settings normalize safely', () => {
  assert.deepEqual(normalizePianoWidgetSettings(null), DEFAULT_PIANO_WIDGET_SETTINGS);
  assert.deepEqual(normalizePianoWidgetSettings({
    labelMode: 'letters',
    showColors: false,
    volume: 2,
  }), {
    labelMode: 'letters',
    showColors: false,
    volume: 0.9,
  });
});

test('piano exposes one octave with unique shortcuts', () => {
  assert.equal(PIANO_KEYS.length, 8);
  assert.equal(PIANO_KEYS[0].note, 'C4');
  assert.equal(PIANO_KEYS[7].note, 'C5');
  assert.equal(new Set(PIANO_KEYS.map(key => key.shortcut)).size, 8);
});

test('piano labels support solfege, letters and both', () => {
  const c4 = PIANO_KEYS[0];
  assert.equal(getPianoKeyPrimaryLabel(c4, 'solfege'), 'Do');
  assert.equal(getPianoKeyPrimaryLabel(c4, 'letters'), 'C');
  assert.equal(getPianoKeyPrimaryLabel(c4, 'both'), 'Do');
  assert.equal(getPianoKeySecondaryLabel(c4, 'both'), 'C4');
  assert.equal(getPianoKeySecondaryLabel(c4, 'letters'), null);
});
