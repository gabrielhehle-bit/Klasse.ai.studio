import test from 'node:test';
import assert from 'node:assert/strict';
import { getMobileWeeklyLessonPermissions } from './weeklyMobileCardPermissions';
import { weekTaskKey, toggleClassroomWeeklyLesson } from './classroomWeeklyPlan';

const key = weekTaskKey('2026/27', 46, 'Donnerstag', 2);
const lesson = { fach: 'Deutsch', thema: 'Silben lesen', imKinderWochenplan: false, materialIds: ['worksheet'] };

test('Mobiler Wochenplan: Unveröffentlichte Stunde ohne Rückmeldungen ist parkbar', () => {
  assert.deepEqual(getMobileWeeklyLessonPermissions({ lesson, taskId: key, students: [] }), {
    canPublish: true, isPublished: false, hasChildFeedback: false, canPark: true,
  });
});

test('Mobiler Wochenplan: Bereits freigegebene Aufgaben nicht versehentlich parken', () => {
  const published = { ...lesson, imKinderWochenplan: true };
  const before = structuredClone(published);
  const state = getMobileWeeklyLessonPermissions({ lesson: published, taskId: key, students: [] });
  assert.equal(state.isPublished, true);
  assert.equal(state.canPark, false);
  assert.deepEqual(published, before);
});

test('Mobiler Wochenplan: Rückmeldungen blockieren Parken selbst nach Entfernen aus Kinderplan', () => {
  const student = { id: 'pupil-1', wochenplanFortschritt: {
    [key]: { done: true, difficulty: 'mittel', updatedAt: '2026-11-13T08:00:00Z' },
  } };
  const app = { wochenplanung: { 46: { Donnerstag: { 2: { ...lesson, imKinderWochenplan: true } } } },
    schueler: [student] };
  const removed = toggleClassroomWeeklyLesson(app, 46, 'Donnerstag', 2);
  assert.equal(removed.wochenplanung[46].Donnerstag[2].imKinderWochenplan, false);
  assert.equal(removed.schueler, app.schueler);
  const state = getMobileWeeklyLessonPermissions({
    lesson: removed.wochenplanung[46].Donnerstag[2],
    taskId: key,
    students: removed.schueler,
  });
  assert.equal(state.isPublished, false);
  assert.equal(state.hasChildFeedback, true);
  assert.equal(state.canPark, false);
  assert.deepEqual(removed.schueler[0].wochenplanFortschritt[key], student.wochenplanFortschritt[key]);
});

test('Mobiler Wochenplan: Auch Hilferuf und angefangene Rückmeldung schützen die Stunde', () => {
  const students = [{ wochenplanFortschritt: { [key]: { helpRequested: true, done: false } } }];
  const state = getMobileWeeklyLessonPermissions({ lesson, taskId: key, students });
  assert.equal(state.hasChildFeedback, true);
  assert.equal(state.canPark, false);
});

test('Mobiler Wochenplan: Fremde Wochen und andere Stunden sperren die Stunde nicht', () => {
  const other = weekTaskKey('2026/27', 46, 'Freitag', 2);
  const students = [{ wochenplanFortschritt: { [other]: { done: true } } }];
  const state = getMobileWeeklyLessonPermissions({ lesson, taskId: key, students });
  assert.equal(state.hasChildFeedback, false);
  assert.equal(state.canPark, true);
});

test('Mobiler Wochenplan: Unvollständige oder alte Stunden werden nicht als Kinderaufgabe angeboten', () => {
  const entries = [undefined, null, {}, { fach: '  ', thema: 'Lesen' },
    { fach: 'Deutsch', thema: '' }, { fach: 'Deutsch', thema: 'Lesen' }];
  entries.forEach((entry, index) => {
    const state = getMobileWeeklyLessonPermissions({ lesson: entry, taskId: key, students: [] });
    assert.equal(state.canPublish, index === 5);
  });
});

test('Mobiler Wochenplan: Rückmeldungen von Demo-/Altkindern werden beim Parkschutz berücksichtigt', () => {
  const students = [{ id: 'demo-old', wochenplanFortschritt: { [key]: { done: false } } }];
  const state = getMobileWeeklyLessonPermissions({ lesson, taskId: key, students });
  assert.equal(state.canPark, false);
});
