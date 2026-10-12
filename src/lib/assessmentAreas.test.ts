import test from 'node:test';
import assert from 'node:assert/strict';
import { getClassLzkAreaSummary, getLzkAreaRows } from './assessmentAreas';
import { countsInClassAverage } from './classAveragePolicy';
import { berechne } from './GradeUtils';
import { getClassPerformanceStats, getStudentPerformanceSummary, getSubjectPerformanceAverages } from './statisticsMetrics';
import { removeSubjectColumn, updateSubjectColumn } from './classroomEdits';

function fixture(): any {
  return { faecher: ['Deutsch', 'Mathematik'], schueler: [{ id: 'a' }, { id: 'b', spf: true }, { id: 'c', espf: true }],
    notenMeta: { Deutsch: { assessmentMode: 'points', colCounts: { lzk: 3, wp: 0, obj: 0 }, colAreas: { lzk: { 0: 'Lesen', 1: 'Lesen', 2: 'Rechtschreiben' } }, colLabels: { lzk: { 0: 'Lesetest' } }, maxPoints: { lzk: [10, 20, 20] } } },
    notenGewichtung: { Deutsch: { sa: 0, lzk: 100, wp: 0, obj: 0, mi: 0, hue: 0 } },
    noten: { a: { Deutsch: { '1': { sa: [], lzk: [10, 0, null], wp: [], aufgaben: [], hue: 0 } } }, b: { Deutsch: { '1': { sa: [], lzk: [0, 0], wp: [], aufgaben: [], hue: 0 } } }, c: { Deutsch: { '1': { sa: [], lzk: [0], wp: [], aufgaben: [], hue: 0 } } } }, mitarbeit: {}, settings: {} };
}
test('class policy persists explicit SPF/ESPF choices and never removes own results', () => {
  const app = fixture();
  assert.equal(countsInClassAverage(app, app.schueler[1], 'Deutsch'), false);
  app.notenMeta.Deutsch.includeSpecialNeedsInStats = true;
  assert.equal(countsInClassAverage(app, app.schueler[2], 'Deutsch'), true);
  app.schueler[1].includeInClassAverage = false;
  app.schueler[2].includeInClassAverage = true;
  assert.equal(countsInClassAverage(app, app.schueler[1], 'Deutsch'), false);
  assert.equal(countsInClassAverage(app, app.schueler[2], 'Mathematik'), true);
  assert.equal(getStudentPerformanceSummary(app, 'b', ['Deutsch']).entries[0].rawValue, 0);
  app.notenMeta.Deutsch.includeSpecialNeedsInStats = false;
  assert.equal(getSubjectPerformanceAverages(app, app.schueler, ['Deutsch'])[0].rawAverage, 25);
  assert.equal(getClassPerformanceStats(app, app.schueler, ['Deutsch']).rawAverage, 25);
  const restored = JSON.parse(JSON.stringify(app));
  assert.equal(countsInClassAverage(restored, restored.schueler[1], 'Deutsch'), false);
});
test('area summaries normalize unequal maxima, retain zero, omit missing and use child policy', () => {
  const app = fixture();
  const rows = getLzkAreaRows(app, 'a');
  assert.deepEqual(rows.map(row => row.value), [100, 0, null]);
  assert.equal(rows[0].label, 'Lesetest');
  assert.equal(rows[2].display, 'Noch nicht bewertet');
  assert.deepEqual(getClassLzkAreaSummary(app, ['Deutsch']).map(row => [row.area, row.count, row.average]), [['Lesen', 2, 50], ['Rechtschreiben', 0, null]]);
  app.schueler[0].includeInClassAverage = false;
  assert.deepEqual(getClassLzkAreaSummary(app, ['Deutsch']), []);
});
test('non-participation excludes saved marks from personal and class results without erasing them', () => {
  const app = fixture(); const data = app.noten.a.Deutsch['1'];
  data.lzkParticipation = { 0: false };
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), 0);
  assert.equal(getLzkAreaRows(app, 'a')[0].display, 'Nicht teilgenommen');
  assert.equal(getClassLzkAreaSummary(app, ['Deutsch'])[0].average, 0);
  data.lzkParticipation[1] = false;
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), null);
  assert.deepEqual(data.lzk, [10, 0, null]);
  const restored = JSON.parse(JSON.stringify(app));
  restored.noten.a.Deutsch['1'].lzkParticipation = { 0: true, 1: true };
  assert.equal(berechne(restored, 'a', 'Deutsch', '1'), 50);
});
test('classification edits preserve grades and other columns; removed columns cannot resurrect stale areas', () => {
  const app = fixture(); const old = JSON.stringify(app);
  const meta = updateSubjectColumn(app.notenMeta, 'Deutsch', 'lzk', 0, 'Neuer Titel', '', 10, '  Leseverständnis  ');
  assert.equal(meta.Deutsch.colAreas.lzk[0], 'Leseverständnis');
  assert.equal(meta.Deutsch.colAreas.lzk[1], 'Lesen');
  assert.equal(JSON.stringify(app), old);
  const removed = removeSubjectColumn(app.noten, meta, 'Deutsch', 'lzk', 1);
  assert.equal(removed.notenMeta.Deutsch.colAreas.lzk[2], undefined);
  assert.equal(updateSubjectColumn(meta, 'Deutsch', 'lzk', 0, '', '', undefined, '').Deutsch.colAreas.lzk[0], '');
});
test('grades and percentages stay in their own subject scales and missing classification is not guessed', () => {
  const app = fixture(); app.notenMeta.Deutsch.assessmentMode = 'grades';
  app.noten.a.Deutsch['1'].lzk = ['1+', 5, null];
  assert.deepEqual(getLzkAreaRows(app, 'a').map(row => row.value), [1, 5, null]);
  app.noten.a.Deutsch['1'].lzkParticipation = { 1: false };
  assert.equal(berechne(app, 'a', 'Deutsch', '1'), 1);
  app.notenMeta.Deutsch.assessmentMode = 'percent';
  app.noten.a.Deutsch['1'].lzk = [100, 0, null];
  assert.equal(getLzkAreaRows(app, 'a')[0].value, 100);
  delete app.notenMeta.Deutsch.colAreas;
  assert.deepEqual(getLzkAreaRows(app, 'a'), []);
});

test('removing an empty LZK clears its exemption and never changes a retained column', () => {
  const app = fixture(); app.noten.a.Deutsch['1'].lzk = [];
  app.noten.a.Deutsch['1'].lzkParticipation = { 0: false, 2: false };
  const next = removeSubjectColumn(app.noten, app.notenMeta, 'Deutsch', 'lzk', 1);
  assert.deepEqual(next.noten.a.Deutsch['1'].lzkParticipation, { 0: false });
  assert.deepEqual(app.noten.a.Deutsch['1'].lzkParticipation, { 0: false, 2: false });
});
