import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getClassroomWeeklyTasks, getChildTaskProgress, updateChildWeeklyProgress, updateChildWeeklyFeedback, getChildWeeklyDossierRows, weekTaskKey, toggleClassroomWeeklyLesson } from './classroomWeeklyPlan';
import type { Student } from '../types';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';
import { createVault } from './vaultService';
import { createEncryptedBackup, decryptBackup } from './backupCryptoService';
import { prepareBackupRestore } from './backupRestore';

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

test('same student IDs in two classes retain independent progress through switch and JSON backup', () => {
  let state = normalizeAppState({
    activeClassId: 'class-a',
    classes: [
      { id: 'class-a', name: 'Klasse A', schuljahr: schoolYear, schueler: [pupil('same-id')], wochenplanung: original.wochenplanung },
      { id: 'class-b', name: 'Klasse B', schuljahr: schoolYear, schueler: [pupil('same-id')], wochenplanung: original.wochenplanung },
    ],
  });
  const taskId = weekTaskKey(schoolYear, 39, 'Montag', 0);
  state = syncActiveClass({ ...state, schueler: updateChildWeeklyProgress(state.schueler, 'same-id', taskId, true, 'schwierig') });
  state = switchClassState(state, 'class-b');
  assert.equal(getChildTaskProgress(state.schueler[0], taskId), undefined);
  state = syncActiveClass({ ...state, schueler: updateChildWeeklyProgress(state.schueler, 'same-id', taskId, true, 'leicht') });
  state = switchClassState(state, 'class-a');
  assert.equal(getChildTaskProgress(state.schueler[0], taskId)?.difficulty, 'schwierig');
  const restored = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(state))));
  assert.equal(getChildTaskProgress(restored.schueler[0], taskId)?.difficulty, 'schwierig');
  assert.equal(getChildTaskProgress(switchClassState(restored, 'class-b').schueler[0], taskId)?.difficulty, 'leicht');
});

test('child checkmarks remain encrypted during JSON backup and restore', async () => {
  const taskId = weekTaskKey(schoolYear, 39, 'Montag', 0);
  const vault = await createVault('Class weekly plan encrypted test vault 123!');
  const state = normalizeAppState({
    schueler: updateChildWeeklyProgress([pupil('synthetic-pupil')], 'synthetic-pupil', taskId, true, 'schwierig'),
    wochenplanung: original.wochenplanung, schuljahr: schoolYear,
  });
  const encrypted = await createEncryptedBackup(state, vault.vaultKey, vault.vaultRecord);
  assert.ok(!JSON.stringify(encrypted).includes('synthetic-pupil'));
  assert.ok(!JSON.stringify(encrypted).includes('schwierig'));
  const parsed = await decryptBackup(encrypted, vault.vaultKey);
  assert.equal(getChildTaskProgress(parsed.schueler[0], taskId)?.difficulty, 'schwierig');
  const restored = await prepareBackupRestore(encrypted, vault.vaultKey, () => null);
  assert.equal(getChildTaskProgress(restored.schueler[0], taskId)?.done, true);
});

test('a single click in the teacher week toggles publication without changing lessons or student progress', () => {
  const taskId = weekTaskKey(schoolYear, 39, 'Montag', 0);
  const pupilWithProgress = updateChildWeeklyProgress([pupil('a')], 'a', taskId, true, 'gut')[0];
  const state = { ...structuredClone(original), schueler: [pupilWithProgress] };
  const unpublished = toggleClassroomWeeklyLesson(state, 39, 'Montag', 0);
  assert.equal(unpublished.wochenplanung[39].Montag[0].imKinderWochenplan, false);
  assert.equal(getClassroomWeeklyTasks(unpublished, 39).length, 1);
  assert.equal(state.wochenplanung[39].Montag[0].imKinderWochenplan, true, 'original state is not mutated');
  assert.equal(unpublished.schueler[0].wochenplanFortschritt?.[taskId]?.done, true);
  assert.equal(unpublished.wochenplanung[40], state.wochenplanung[40], 'other week is untouched');
  assert.equal(unpublished.wochenplanung[39].Montag[1], state.wochenplanung[39].Montag[1], 'other lesson is untouched');
  const republished = toggleClassroomWeeklyLesson(unpublished, 39, 'Montag', 0);
  assert.equal(republished.wochenplanung[39].Montag[0].imKinderWochenplan, true);
  assert.equal(getClassroomWeeklyTasks(republished, 39).length, 2);
  assert.equal(republished.schueler[0].wochenplanFortschritt?.[taskId]?.difficulty, 'gut');
});

test('direct classroom publication ignores empty/invalid slots and works with imported numeric days', () => {
  assert.equal(toggleClassroomWeeklyLesson(original, 39, 'Montag', 999), original);
  assert.equal(toggleClassroomWeeklyLesson(original, 39, 'Sonntag', 0), original);
  assert.equal(toggleClassroomWeeklyLesson(original, 98, 'Montag', 0), original);
  assert.equal(toggleClassroomWeeklyLesson(original, 39, 'Montag', -1), original);
  const numeric: { wochenplanung: Record<number, any> } = { wochenplanung: { 39: { 0: { 0: { fach: 'Deutsch', thema: 'Lesen', material: 'Heft' } } } } };
  const published = toggleClassroomWeeklyLesson(numeric, 39, 'Montag', 0);
  assert.equal(published.wochenplanung[39][0][0].imKinderWochenplan, true);
  assert.equal(published.wochenplanung[39][0][0].material, 'Heft');
});

test('one-tap help and difficulty survive completion, edits, class switching and JSON backups', () => {
  const tasks = getClassroomWeeklyTasks(original, 39);
  const first = updateChildWeeklyFeedback([pupil('a'), pupil('b')], 'a', tasks[0], 'hilfe', new Date('2026-09-20T10:00:00Z'));
  const help = getChildTaskProgress(first[0], tasks[0].id);
  assert.equal(help?.done, false);
  assert.equal(help?.helpRequested, true);
  assert.equal(help?.helpRequestedAt, '2026-09-20T10:00:00.000Z');
  assert.equal(getChildTaskProgress(first[1], tasks[0].id), undefined, 'Never mark another child');
  const finished = updateChildWeeklyFeedback(first, 'a', tasks[0], 'schwierig', new Date('2026-09-20T10:15:00Z'));
  const recorded = getChildTaskProgress(finished[0], tasks[0].id);
  assert.equal(recorded?.done, true);
  assert.equal(recorded?.difficulty, 'schwierig');
  assert.equal(recorded?.helpRequested, true, 'Help is NOT erased when done');
  assert.equal(recorded?.helpRequestedAt, '2026-09-20T10:00:00.000Z');
  const rows = getChildWeeklyDossierRows(finished[0]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows.map(row => [row.week, row.schoolYear, row.taskTitle, row.taskSubject, row.helpRequested, row.difficulty]),
    [[39, schoolYear, 'Wörter schreiben', 'Deutsch', true, 'schwierig']]);
  assert.equal(getChildTaskProgress(first[0], tasks[0].id)?.done, false, 'Original help record remains unchanged');
  const json = JSON.parse(JSON.stringify(finished));
  assert.equal(getChildWeeklyDossierRows(json[0])[0]?.helpRequested, true);
});

test('one-tap feedback cannot create fabricated progress for malformed task or date', () => {
  const tasks = getClassroomWeeklyTasks(original, 39);
  const roster = [pupil('a')];
  assert.deepEqual(updateChildWeeklyFeedback(roster, 'other', tasks[0], 'hilfe'), roster);
  assert.equal(updateChildWeeklyFeedback(roster, 'a', { ...tasks[0], id: '' }, 'hilfe'), roster);
  assert.equal(updateChildWeeklyFeedback(roster, 'a', tasks[0], 'hilfe', new Date('invalid')), roster);
  assert.deepEqual(getChildWeeklyDossierRows({ ...pupil('a'), wochenplanFortschritt: { 'junk': { done: true, updatedAt: '' } } }), []);
});

test('child board has visible name bar, no name-selection dialog and single-tap help/difficulty actions', () => {
  const widget = readFileSync('src/components/cockpit/widgets/ClassroomWeeklyPlanWidget.tsx', 'utf8');
  const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');
  assert.match(widget, /aria-label="Wähle deinen Namen"/);
  assert.match(widget, /pupils\.map\(student => <button/);
  assert.doesNotMatch(widget, /setPanel\('names'\)|Seite \{namePage \+ 1\} von/);
  assert.match(widget, /saveFeedback\(task, 'hilfe'\)/);
  assert.match(widget, /onClick=\{\(\) => saveFeedback\(task, choice\.value\)\}/);
  assert.match(widget, /if \(tasks\.length === 1\) close\(\)/);
  assert.match(dossier, /getChildWeeklyDossierRows\(student\)/);
  assert.match(dossier, /bei \$\{helpTaskCount\} Aufgaben Hilfe angefragt/);
});
