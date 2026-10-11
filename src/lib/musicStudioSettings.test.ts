import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeMusicStudioSettings,
  normalizeMusicStudioMode,
} from './musicStudioSettings';

test('music studio keeps existing lesson state when the selected area changes', () => {
  const existing = {
    volume: 0.35,
    rhythmPattern: [1, 0, 1, 1],
    rhythmScore: 4,
    ambientTimerMinutes: 12,
  };

  assert.deepEqual(
    mergeMusicStudioSettings(existing, { musicStudioMode: 'rhythm' }),
    {
      ...existing,
      musicStudioMode: 'rhythm',
    },
  );
});

test('music studio keeps the selected area and lesson state when volume changes', () => {
  const existing = {
    musicStudioMode: 'ambient',
    ambientTimerMinutes: 7,
    soundVolumes: { rain: 0.4, waves: 0.2 },
  };

  assert.deepEqual(
    mergeMusicStudioSettings(existing, { volume: 0.6 }),
    {
      ...existing,
      volume: 0.6,
    },
  );
});

test('unknown stored music modes safely fall back to signals', () => {
  assert.equal(normalizeMusicStudioMode('rhythm'), 'rhythm');
  assert.equal(normalizeMusicStudioMode('legacy-mode'), 'signals');
  assert.equal(normalizeMusicStudioMode(undefined), 'signals');
});
