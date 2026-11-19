import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCockpitCountdownSeconds, getCockpitTimerPreferences, parseCockpitCountdown,
  type CockpitCountdownRun,
} from './cockpitCountdown';

const running: CockpitCountdownRun = {
  status: 'running', duration: 300, remaining: 300, endsAt: 400_000, alarm: { sound: 'beep', muted: true },
};

test('the running classroom countdown restores by its absolute deadline', () => {
  const restored = parseCockpitCountdown(JSON.stringify(running), 336_200);
  assert.deepEqual(restored, running);
  assert.equal(getCockpitCountdownSeconds(restored!, 336_200), 64);
  assert.deepEqual(parseCockpitCountdown(JSON.stringify(running), 400_000), {
    ...running, status: 'expired', remaining: 0, endsAt: null,
  });
});

test('paused time survives restoration and unusable storage is ignored', () => {
  const paused = { ...running, status: 'paused', remaining: 112, endsAt: null } as const;
  assert.deepEqual(parseCockpitCountdown(JSON.stringify(paused), 900_000), paused);
  assert.equal(getCockpitCountdownSeconds(paused, 990_000), 112);
  for (const value of [null, 'invalid', '{}', JSON.stringify({ ...running, endsAt: null }),
    JSON.stringify({ ...running, duration: -1 }), JSON.stringify({ ...running, alarm: {} })]) {
    assert.equal(parseCockpitCountdown(value, 100_000), null);
  }
  assert.deepEqual(getCockpitTimerPreferences(null), getCockpitTimerPreferences({}));
  assert.deepEqual(getCockpitTimerPreferences({ alarmSound: 'unknown', preferredDuration: 0 }), {
    duration: 300, alarm: { sound: 'bell', muted: false },
  });
});
