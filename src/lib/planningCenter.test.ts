import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clonePlanningData,
  getPreviousCalendarWeekNumber,
  getYearPlanWeekFocus,
  setYearPlanWeekFocus,
} from './planningCenter';

test('structured yearly-plan cells produce a readable week focus', () => {
  const week = {
    deutsch_sprache: { thema: 'Direkte Rede', buch: 'S. 10' },
    mathe_et: { thema: 'Schriftliche Division' },
    sachunterricht: { thema: 'Bezirk Feldkirch' },
  };

  assert.equal(
    getYearPlanWeekFocus(week),
    'Direkte Rede · Schriftliche Division · Bezirk Feldkirch'
  );
});

test('explicit planning-center focus wins without destroying subject cells', () => {
  const source = {
    37: {
      deutsch_sprache: { thema: 'Direkte Rede', buch: 'S. 10', items: [{ id: 'x' }] },
      mathe_et: { thema: 'Division', type: 'standard' },
    },
  };

  const next = setYearPlanWeekFocus(source, 37, 'Projektwoche Wasser');

  assert.equal(getYearPlanWeekFocus(next[37]), 'Projektwoche Wasser');
  assert.deepEqual(next[37].deutsch_sprache, source[37].deutsch_sprache);
  assert.deepEqual(next[37].mathe_et, source[37].mathe_et);
  assert.deepEqual(source[37], {
    deutsch_sprache: { thema: 'Direkte Rede', buch: 'S. 10', items: [{ id: 'x' }] },
    mathe_et: { thema: 'Division', type: 'standard' },
  });
});

test('clearing planning-center focus preserves structured yearly-plan cells', () => {
  const source = {
    37: {
      __planningFocus: 'Wasser',
      deutsch_sprache: { thema: 'Direkte Rede' },
    },
  };

  const next = setYearPlanWeekFocus(source, 37, '   ');
  assert.equal(next[37].__planningFocus, undefined);
  assert.equal(next[37].deutsch_sprache.thema, 'Direkte Rede');
  assert.equal(getYearPlanWeekFocus(next[37]), 'Direkte Rede');
});

test('legacy string week focus remains editable without inventing a new schema', () => {
  const source = { 37: 'Herbst' };
  const next = setYearPlanWeekFocus(source, 37, 'Wald');
  assert.equal(next[37], 'Wald');
});

test('previous calendar week rolls correctly across ISO year boundary', () => {
  assert.equal(getPreviousCalendarWeekNumber(new Date(2021, 0, 4, 12)), 53);
  assert.equal(getPreviousCalendarWeekNumber(new Date(2026, 8, 14, 12)), 37);
});

test('planning templates are deep-cloned before reuse', () => {
  const source = { Montag: { 0: { fach: 'Deutsch', thema: 'Lesen' } } };
  const cloned = clonePlanningData(source);
  cloned.Montag[0].thema = 'Schreiben';
  assert.equal(source.Montag[0].thema, 'Lesen');
});
