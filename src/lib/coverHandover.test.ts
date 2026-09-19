import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COVER_CHECKLIST, getCoverDates, getCoverLesson } from './coverHandover';
import { getKW } from './utils';

test('default handover checklist has no items pre-confirmed and no public health sheet', () => {
  assert.ok(DEFAULT_COVER_CHECKLIST.length > 0);
  assert.ok(DEFAULT_COVER_CHECKLIST.every(item => !item.checked));
  assert.ok(DEFAULT_COVER_CHECKLIST.every(item => !item.text.includes('sichtbar am Lehrertisch')));
});

test('handover period accepts an exact local day without UTC drift', () => {
  const days = getCoverDates({
    rangeMode: 'single', singleDate: '2026-09-19',
    startDate: '', endDate: '', weekDate: '',
  });
  assert.equal(days.length, 1);
  assert.equal(days[0].getDate(), 19);
  assert.equal(days[0].getDay(), 6);
  assert.equal(getCoverDates({ rangeMode: 'single', singleDate: '2026-02-30', startDate: '', endDate: '', weekDate: '' }).length, 0);
});

test('handover week starts on Monday even for a Saturday selection', () => {
  const days = getCoverDates({
    rangeMode: 'week', singleDate: '', startDate: '', endDate: '', weekDate: '2026-09-19',
  });
  assert.deepEqual(days.map(d => d.getDay()), [1, 2, 3, 4, 5]);
  assert.deepEqual(days.map(d => d.getDate()), [14, 15, 16, 17, 18]);
});

test('handover range skips weekends, validates reversed dates and never emits more than 14 days', () => {
  const input = { rangeMode: 'multi' as const, singleDate: '', weekDate: '', startDate: '2026-09-18', endDate: '2026-09-23' };
  assert.deepEqual(getCoverDates(input).map(d => d.getDay()), [5, 1, 2, 3]);
  assert.equal(getCoverDates({ ...input, endDate: '2026-09-17' }).length, 0);
  assert.equal(getCoverDates({ ...input, endDate: '2026-12-31' }).length, 14);
});

test('handover reads the selected day and exact 1-indexed lesson slot from the weekly plan', () => {
  const date = new Date(2026, 8, 16, 12);
  const app = {
    wochenplanung: {
      [getKW(date)]: {
        Mittwoch: { 0: { fach: 'Mathematik', thema: 'Zehnerübergang', material: 'AB 1', hausuebung: 'S. 4' }, 1: { thema: 'Lesen' } },
        Donnerstag: { 0: { fach: 'Falscher Tag', thema: 'Nicht verwenden' } },
      },
    },
    stammplan: { Mittwoch: { 2: 'Deutsch' } },
  } as any;
  assert.deepEqual(getCoverLesson(app, date, 1), {
    fach: 'Mathematik', thema: 'Zehnerübergang', material: 'AB 1', hausuebung: 'S. 4',
  });
  assert.equal(getCoverLesson(app, date, 2).fach, 'Deutsch');
  assert.equal(getCoverLesson(app, date, 2).thema, 'Lesen');
  assert.equal(getCoverLesson(app, date, 3).fach, '');
});