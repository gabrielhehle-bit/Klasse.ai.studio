import test from 'node:test';
import assert from 'node:assert/strict';
import { getClassroomWeeklyTasks, getChildTaskProgress, updateChildWeeklyProgress, weekTaskKey } from './classroomWeeklyPlan';
import type { Student } from '../types';

const schoolYear = '2026/27';
const original = {
  schuljahr: schoolYear,
  wochenplanung: {
    39: {
      Montag: {
        0: { fach: 'Deutsch', thema: 'Wörter schreiben', material: 'Bleistift', imKinderWochenplan: true },
        1: { fach: 'Mathematik', thema: 'Lehrerinterne Planung', imKinderWochenplan: false },
        2: { fach: 'Mathematik', thema: 'Zahlen bis 20', material: 'Lehrkraft-Dokument', wochenplanMaterial: 'Arbeitsheft, Seite 12', imKinderWochenplan: true },
        zeitunabhaengig: [],
      },
    },
    40: { Dienstag: { 0: { fach: 'Deutsch', thema: 'Andere Woche', imKinderWochenplan: true } } },
  },
};
const pupil = (id: string): Student => ({ id, vorname: id, nachname: 'Test', name: id } as Student);

test('public tasks include only explicitly released lesson details and child materials', () => {
  const tasks = getClassroomWeeklyTasks(original, 39);
  assert.equal(tasks.length, 2);
  assert.deepEqual(tasks.map(t => t.title), ['Wörter schreiben', 'Zahlen bis 20']);
  assert.equal(tasks[0].material, 'Bleistift');
  assert.equal(tasks[1].material, 'Arbeitsheft, Seite 12');
  assert.ok(!JSON.stringify(tasks).includes('Lehrerinterne Planung'));
  assert.ok(!JSON.stringify(tasks).includes('Lehrkraft-Dokument'));
  assert.ok(!JSON.stringify(tasks).includes('Andere Woche'));
});

test('editing a selected lesson retains its task identity and a child checkmark', () => {
  const tasks = getClassroomWeeklyTasks(original, 39);
  const progress = updateChildWeeklyProgress([pupil('a')], 'a', tasks[0].id, true, 'schwierig');
  const edited = structuredClone(original);
  edited.wochenplanung[39].Montag[0].thema = 'Korrigierte Wörter schreiben';
  assert.equal(getClassroomWeeklyTasks(edited, 39)[0].id, tasks[0].id);
  assert.equal(getChildTaskProgress(progress[0], tasks[0].id)?.difficulty, 'schwierig');
});

test('checkmark and difficulty are editable for one child only and do not leak to other weeks or pupils', () => {
  const key = weekTaskKey(schoolYear, 39, 'Montag', 0);
  const first = updateChildWeeklyProgress([pupil('a'), pupil('b')], 'a', key, true, 'leicht');
  assert.equal(first[0].wochenplanFortschritt?.[key]?.done, true);
  assert.equal(first[0].wochenplanFortschritt?.[key]?.difficulty, 'leicht');
  assert.equal(first[1].wochenplanFortschritt, undefined);
  const second = updateChildWeeklyProgress(first, 'a', key, true, 'gut');
  assert.equal(second[0].wochenplanFortschritt?.[key]?.difficulty, 'gut');
  assert.equal(second[0].wochenplanFortschritt?.[weekTaskKey(schoolYear, 40, 'Montag', 0)], undefined);
  const undone = updateChildWeeklyProgress(second, 'a', key, false);
  assert.equal(undone[0].wochenplanFortschritt?.[key]?.done, false);
  assert.equal(undone[0].wochenplanFortschritt?.[key]?.difficulty, undefined);
  assert.equal(first[0].wochenplanFortschritt?.[key]?.done, true, 'updates are immutable');
  assert.notEqual(key, weekTaskKey('2027/28', 39, 'Montag', 0));
});

test('empty and legacy weekly plans stay empty instead of inventing demo pupils or tasks', () => {
  assert.deepEqual(getClassroomWeeklyTasks({ schuljahr: schoolYear, wochenplanung: {} }, 39), []);
  assert.deepEqual(getClassroomWeeklyTasks({ schuljahr: schoolYear, wochenplanung: { 39: { Montag: { 0: { fach: 'Deutsch', thema: 'Legacy' } } } } }, 39), []);
  assert.deepEqual(updateChildWeeklyProgress([], 'fake', 'task', true), []);
});

test('numeric imported weekday keys map to one stable week task, never duplicate it', () => {
  const plan = { schuljahr: schoolYear, wochenplanung: { 39: { 0: { 0: { fach: 'Deutsch', thema: 'Lesen', imKinderWochenplan: true } } } } };
  const tasks = getClassroomWeeklyTasks(plan, 39);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, weekTaskKey(schoolYear, 39, 'Montag', 0));
});
