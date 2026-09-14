import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLessonTimeSlots,
  findCurrentLessonSlot,
  parseLessonTimeRange,
} from './lessonTimeSlots';

test('lesson time parser accepts Klassio setup formats', () => {
  assert.deepEqual(parseLessonTimeRange('08:00–08:50'), { start: 480, end: 530 });
  assert.deepEqual(parseLessonTimeRange('8:00 - 8:50'), { start: 480, end: 530 });
  assert.deepEqual(parseLessonTimeRange('13.30—14.20'), { start: 810, end: 860 });
});

test('lesson time parser rejects missing, invalid and backwards ranges', () => {
  assert.equal(parseLessonTimeRange(''), null);
  assert.equal(parseLessonTimeRange('Zeit definieren'), null);
  assert.equal(parseLessonTimeRange('25:00–26:00'), null);
  assert.equal(parseLessonTimeRange('10:00–09:00'), null);
});

test('configured lesson times support all ten slots without invented defaults', () => {
  const fallback = {
    1: '08:00–08:50',
    2: '08:50–09:45',
  };
  const configured = {
    ...fallback,
    9: '16:05–16:50',
    10: '17:00–17:45',
  };

  const slots = buildLessonTimeSlots(configured, fallback, 10);
  assert.deepEqual(slots.map(slot => slot.slot), [1, 2, 9, 10]);
  assert.equal(findCurrentLessonSlot(slots, 16 * 60 + 20)?.slot, 9);
  assert.equal(findCurrentLessonSlot(slots, 17 * 60 + 20)?.slot, 10);
});

test('an explicitly blank configured slot stays blank instead of receiving a fake fallback time', () => {
  const slots = buildLessonTimeSlots({ 1: '' }, { 1: '08:00–08:50' }, 1);
  assert.deepEqual(slots, []);
});
