import test from 'node:test';
import assert from 'node:assert/strict';
import { completeMissingAttendance, getSubjectColumnRemovalBlockReason, removeSubjectColumn, updateSubjectColumn } from './classroomEdits';

test('completion preserves absences, excused hours and other dates while filling missing hours', () => {
  const before = { a: { today: { 1: 'u', 2: 'e' }, yesterday: { 1: 'u' } }, b: { today: { 1: 'a' } }, outsider: { today: { 1: 'u' } } };
  const snapshot = structuredClone(before);
  const after = completeMissingAttendance(before, ['a', 'b', 'c'], 'today', [1, 2, 3]);
  assert.deepEqual(after.a.today, { 1: 'u', 2: 'e', 3: 'a' });
  assert.deepEqual(after.b.today, { 1: 'a', 2: 'a', 3: 'a' });
  assert.deepEqual(after.c.today, { 1: 'a', 2: 'a', 3: 'a' });
  assert.deepEqual(after.a.yesterday, before.a.yesterday);
  assert.deepEqual(after.outsider, before.outsider);
  assert.deepEqual(before, snapshot);
  assert.deepEqual(completeMissingAttendance(after, ['a', 'b', 'c'], 'today', [1, 2, 3]), after);
});

test('completion preserves unfamiliar recorded statuses and fills only truly empty entries', () => {
  const after = completeMissingAttendance({ a: { today: { 1: 'future-status', 2: '' } } }, ['a'], 'today', [1, 2]);
  assert.deepEqual(after.a.today, { 1: 'future-status', 2: 'a' });
});

for (const subject of ['Deutsch', 'Mathematik']) {
  test(`editing ${subject} metadata never changes the other subject even with legacy sync enabled`, () => {
    const before = { syncWpDeutschMath: true, Deutsch: { colLabels: { wp: { 0: 'Lesen' } }, colDates: { wp: { 0: '2026-09-01' } }, maxPoints: { wp: { 0: 10 } }, extension: 'keep' }, Mathematik: { colLabels: { wp: { 0: 'Rechnen' } }, colDates: { wp: { 0: '2026-09-02' } }, maxPoints: { wp: { 0: 20 } } } };
    const snapshot = structuredClone(before);
    const other = subject === 'Deutsch' ? 'Mathematik' : 'Deutsch';
    const after = updateSubjectColumn(before, subject, 'wp', 0, 'Neuer Abschnitt', '', 30);
    assert.deepEqual(after[other], before[other]);
    assert.equal(after[subject].colLabels.wp[0], 'Neuer Abschnitt');
    assert.equal(after[subject].colDates.wp[0], undefined);
    assert.equal(after[subject].maxPoints.wp[0], 30);
    assert.equal(after.Deutsch.extension, 'keep');
    assert.deepEqual(before, snapshot);
  });
}

test('new subject metadata does not reuse another subject and invalid points preserve existing values', () => {
  const before = { Deutsch: { maxPoints: { lzk: { 0: 20 } } } };
  assert.equal(updateSubjectColumn(before, 'Deutsch', 'lzk', 0, 'Test', '', NaN).Deutsch.maxPoints.lzk[0], 20);
  const after = updateSubjectColumn(before, 'Sachunterricht', 'lzk', 0, 'Natur', '2026-09-11', 10);
  assert.deepEqual(after.Deutsch, before.Deutsch);
  assert.equal(after.Sachunterricht.colLabels.lzk[0], 'Natur');
});


test('removal is blocked when either historic period contains grades, including 0 and absence codes', () => {
  const noten: any = {
    s1: { Deutsch: {
      '1': { lzk: [1, 2, 3, 0], wp: [], aufgaben: [] },
      '2': { lzk: [1, 2, 3, 'e'], wp: [], aufgaben: [] },
    }, Mathematik: { '1': { lzk: [5, 4, 3, 2] } } },
  };
  const meta: any = { Deutsch: { colCounts: { lzk: 4 }, colLabels: { lzk: { 3: 'Geometrie' } } } };
  const snapshot = structuredClone({ noten, meta });
  assert.equal(getSubjectColumnRemovalBlockReason(noten, meta, 'Deutsch', 'lzk', 3), 'grades');
  const result = removeSubjectColumn(noten, meta, 'Deutsch', 'lzk', 3);
  assert.deepEqual(result.noten, noten);
  assert.deepEqual(result.notenMeta, meta);
  assert.deepEqual({ noten, meta }, snapshot);
});

test('nonparticipation and metadata are protected even when all numeric cells are empty', () => {
  const meta: any = { Deutsch: { colCounts: { lzk: 4 }, maxPoints: { lzk: { 3: 20 } } } };
  const noten: any = { s1: { Deutsch: { '2': { lzk: [], lzkParticipation: { 3: false } } } } };
  assert.equal(getSubjectColumnRemovalBlockReason(noten, meta, 'Deutsch', 'lzk', 3), 'grades');
  assert.equal(getSubjectColumnRemovalBlockReason({}, meta, 'Deutsch', 'lzk', 3), 'metadata');
  const other: any = { Deutsch: { colCounts: { wp: 4 }, colDates: { wp: { 3: '2026-10-01' } } } };
  assert.equal(getSubjectColumnRemovalBlockReason({}, other, 'Deutsch', 'wp', 3), 'metadata');
});

test('truly empty trailing columns can still be removed without modifying saved grades in other slots or subjects', () => {
  const noten: any = { s1: {
    Deutsch: { '1': { lzk: [1, 2, 3, null], wp: [], aufgaben: [] },
      '2': { lzk: [1, 2, 3, undefined], wp: [] } },
    Mathematik: { '1': { lzk: [4, 3, 2, 1] } },
  } };
  const meta: any = {
    Deutsch: { colCounts: { lzk: 4, wp: 4, obj: 4 },
      colLabels: { lzk: { 0: 'A' } }, maxPoints: { lzk: { 0: 10 } } },
    Mathematik: { colCounts: { lzk: 4 } },
  };
  const before = structuredClone({ noten, meta });
  assert.equal(getSubjectColumnRemovalBlockReason(noten, meta, 'Deutsch', 'lzk', 3), null);
  const result = removeSubjectColumn(noten, meta, 'Deutsch', 'lzk', 3);
  assert.deepEqual(result.noten.s1.Deutsch['1'].lzk, [1, 2, 3]);
  assert.deepEqual(result.noten.s1.Mathematik, before.noten.s1.Mathematik);
  assert.equal(result.notenMeta.Deutsch.colCounts.lzk, 3);
  assert.deepEqual(result.notenMeta.Mathematik, before.meta.Mathematik);
  assert.deepEqual({ noten, meta }, before);
});
