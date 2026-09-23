import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState, switchClassState, syncActiveClass } from './appState';
import { homeworkForDay, homeworkForWeek, upsertHomework } from './dailyHomework';

const entry = (patch: Record<string, unknown> = {}) => ({
  id: 'homework-1', aufgegebenAm: '2026-09-23', faelligAm: '2026-09-25',
  fach: 'Deutsch', aufgabe: 'Arbeitsheft Seite 12', schuljahr: '2026/27', ...patch,
});

test('standalone homework allows several subjects per day and rejects missing due date', () => {
  const first = upsertHomework([], entry());
  const second = upsertHomework(first, entry({ id: 'homework-2', fach: 'Mathematik', aufgabe: 'Beispiele 2 und 3' }));
  assert.equal(second.length, 2);
  assert.equal(homeworkForDay(second, '2026-09-23', '2026/27').length, 2);
  assert.equal(homeworkForDay(second, '2026-09-23', '2025/26').length, 0);
  assert.deepEqual(first, [entry()]);
  assert.throws(() => upsertHomework(second, entry({ faelligAm: '' })), /Abgabedatum/);
  assert.throws(() => upsertHomework(second, entry({ faelligAm: '2026-09-22' })), /Abgabedatum/);
  assert.throws(() => upsertHomework(second, entry({ aufgabe: ' ' })), /Aufgabe/);
  assert.equal(upsertHomework(second, entry({ aufgabe: 'Seite 13' })).length, 2);
});

test('week selection follows the school-year Monday, not unrelated 2025 records with same week number', () => {
  const app = { schuljahr: '2026/27', bundesland: 'VBG', hausuebungen: [
    entry(), entry({ id: 'other-week', aufgegebenAm: '2026-10-01', faelligAm: '2026-10-05' }),
    entry({ id: 'other-year', schuljahr: '2025/26' }),
  ] } as any;
  assert.deepEqual(homeworkForWeek(app, 39).map(item => item.id), ['homework-1']);
});

test('class switch, normalized backup and sync do not move homework to another class', () => {
  const firstClass = { id: 'a', name: '1a', stufe: 1, klassenvorstand: true,
    schueler: [], wochenplanung: {}, hausuebungen: [entry()] };
  const secondClass = { id: 'b', name: '1b', stufe: 1, klassenvorstand: true,
    schueler: [], wochenplanung: {}, hausuebungen: [] };
  const state = normalizeAppState({
    ...initialAppState, activeClassId: 'a', classes: [firstClass, secondClass],
    schuljahr: '2026/27', klassenbezeichnung: '1a', stufe: 1,
    schueler: [], wochenplanung: {}, hausuebungen: [entry()],
  } as any);
  assert.equal(state.hausuebungen?.length, 1);
  const b = switchClassState(syncActiveClass(state), 'b');
  assert.deepEqual(b.hausuebungen, []);
  assert.equal(b.classes.find(item => item.id === 'a')?.hausuebungen?.length, 1);
  const a = switchClassState(b, 'a');
  assert.equal(a.hausuebungen?.[0]?.aufgabe, 'Arbeitsheft Seite 12');
  assert.deepEqual(normalizeAppState(JSON.parse(JSON.stringify(a))).hausuebungen, a.hausuebungen);
});

test('homework entry and both cockpit widgets share the same independent data source', () => {
  const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  const center = readFileSync('src/components/PlanungsZentrale.tsx', 'utf8');
  const renderer = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const board = readFileSync('src/components/cockpit/widgets/ClassroomWeeklyPlanWidget.tsx', 'utf8');
  const homework = readFileSync('src/components/cockpit/widgets/HomeworkWidget.tsx', 'utf8');
  const editor = readFileSync('src/components/DailyHomeworkButton.tsx', 'utf8');
  assert.match(weekly, /<DailyHomeworkButton day=\{tag\} date=\{dateStr\}/);
  assert.match(center, /<DailyHomeworkButton day=\{dayName\}/);
  assert.match(editor, /faelligAm/);
  assert.match(editor, /prev\.activeClassId !== owner/);
  assert.match(board, /homeworkForWeek\(app, week\)/);
  assert.match(homework, /homeworkForWeek\(app, week\)/);
  assert.match(renderer, /case "homework":/);
  assert.match(renderer, /type: "homework"/);
  assert.doesNotMatch(weekly, /placeholder="Hausaufgabe notieren/);
  assert.doesNotMatch(center, /Hausübung \/ Notiz<\/label>/);
});
