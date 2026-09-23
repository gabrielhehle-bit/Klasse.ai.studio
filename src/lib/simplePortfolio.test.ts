import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getSimpleAnnualGoalRatings, getSimpleManualRadarValue, getSimpleRadarGoalProgress, getSimpleSubjectAreas, getSimpleSubjectGrades } from './simplePortfolio';
import { initialAppState } from './appState';

test('Deutsch in der ersten Schulstufe shows exactly four areas and all 12 unchanged goal ids', () => {
  const areas = getSimpleSubjectAreas('Deutsch', 1);
  assert.deepEqual(areas.map(item => item.name), ['Hören/Sprechen', 'Lesen', 'Schreiben', 'Sprachbetrachtung']);
  assert.deepEqual(areas.map(item => item.goals.length), [3, 4, 5, 0]);
  assert.equal(areas[0].goals[0].text, 'Aufmerksam zuhören und Erlebtes verständlich erzählen');
  assert.equal(new Set(areas.flatMap(item => item.goals.map(goal => goal.id))).size, 12);
});

test('manual goal IDs and all subject areas are preserved, even when there are more than four prefixes', () => {
  const student = {
    manuelleLernziele: [{ id: 'goal-custom', fach: 'Deutsch', kompetenzbereich: 'Sprachbetrachtung', text: 'Wortarten unterscheiden', stufe: 1 }],
  } as any;
  const areas = getSimpleSubjectAreas('Deutsch', 1, student);
  assert.equal(areas.length, 4);
  assert.equal(areas[3].goals[0].id, 'goal-custom');
  const maths = getSimpleSubjectAreas('Mathematik', 1);
  assert.equal(maths.length, 4);
  assert.equal(maths.flatMap(item => item.goals).length, 13);
});

test('own goals use individual 0–100 radar values without affecting ordinary 4-level ratings', () => {
  const student = {
    manuelleLernziele: [
      { id: 'own-1', fach: 'Deutsch', kompetenzbereich: 'Lesen', text: 'Lesetempo', stufe: 1 },
      { id: 'own-0', fach: 'Deutsch', kompetenzbereich: 'Lesen', text: 'Wortschatz', stufe: 1 },
    ],
    portfolioRadarWerte: { 'own-1': 75, 'own-0': 0, '1_d1': 99 },
  } as any;
  const ratings = { 'own-1': 3, '1_d1': 2 } as Record<string, number | null>;
  assert.equal(getSimpleManualRadarValue(student, 'own-1'), 75);
  assert.equal(getSimpleManualRadarValue(student, 'own-0'), 0);
  assert.equal(getSimpleManualRadarValue(student, '1_d1'), undefined);
  assert.equal(getSimpleRadarGoalProgress('own-1', ratings, student), 0.75);
  assert.equal(getSimpleRadarGoalProgress('own-0', ratings, student), 0);
  assert.equal(getSimpleRadarGoalProgress('1_d1', ratings, student), 2 / 3);
  assert.equal(getSimpleRadarGoalProgress('own-1', ratings, undefined), 1 / 3);
  assert.equal(getSimpleRadarGoalProgress('own-1', ratings, {
    ...student, portfolioRadarWerte: { ...student.portfolioRadarWerte, 'own-1': -2 },
  }), 1 / 3);
  assert.equal(getSimpleRadarGoalProgress('own-1', ratings, {
    ...student, portfolioRadarWerte: { ...student.portfolioRadarWerte, 'own-1': 101 },
  }), 1 / 3);
  assert.deepEqual(ratings, { 'own-1': 3, '1_d1': 2 });
});

test('annual assessment reads legacy root and period one without overwriting period two', () => {
  const app = {
    ...initialAppState,
    studentLernzielBewertungen: { pupil: { '1_d1': 3, '1_d2': 2 } },
    studentLernzielSemesterBewertungen: { pupil: { '1': { '1_d1': 1 }, '2': { '1_d3': 3 } } },
  } as any;
  assert.deepEqual(getSimpleAnnualGoalRatings(app, 'pupil'), { '1_d1': 1, '1_d2': 2 });
  assert.deepEqual(app.studentLernzielSemesterBewertungen.pupil['2'], { '1_d3': 3 });
});

test('grade ring only counts real grades, never interprets percentages as grades', () => {
  const app = {
    ...initialAppState,
    noten: { pupil: { Deutsch: { '1': { sa: ['1', '2+'], lzk: [null, '3'], wp: [], aufgaben: ['4', '65'], hue: 0, hueAnm: [] } } } },
    notenMeta: { Deutsch: { assessmentMode: 'grades' } },
  } as any;
  assert.deepEqual(getSimpleSubjectGrades(app, 'pupil', 'Deutsch').map(item => item.group), [1, 2, 3, 4]);
  app.notenMeta.Deutsch.assessmentMode = 'percent';
  assert.deepEqual(getSimpleSubjectGrades(app, 'pupil', 'Deutsch'), []);
});

test('portfolio display shows two configurable radar charts, notes and four goal levels', () => {
  const outer = readFileSync('src/components/Portfolio.tsx', 'utf8');
  const view = readFileSync('src/components/SimplePortfolioView.tsx', 'utf8');
  assert.match(outer, /mergeLegacyPortfolioEntries/);
  assert.match(outer, /SimplePortfolioView/);
  assert.doesNotMatch(outer, /StudentPortfolio\s*\//);
  assert.doesNotMatch(outer, /Semester/);
  assert.match(view, /<PortfolioFlower title="Noten"/);
  assert.match(view, /<PortfolioFlower title="Lernziele"/);
  assert.doesNotMatch(view, /<CircleDiagram/);
  assert.match(view, /goalAxisIds\.map/);
  assert.match(view, /axisGoals\.filter/);
  const flower = readFileSync('src/components/PortfolioFlower.tsx', 'utf8');
  assert.match(flower, /data-radar-axis/);
  assert.match(flower, /data-radar-progress/);
  assert.match(flower, /data-radar-grid/);
  assert.match(flower, /data-radar-shape/);
  assert.match(flower, /axes\.map/);
  assert.match(flower, /Math\.min\(1, Math\.max\(0, raw\)\)/);
  assert.match(view, /getSimpleRadarGoalProgress/);
  assert.match(view, /getSimpleManualRadarValue/);
  assert.match(view, /Eigenes Radar-Lernziel/);
  assert.match(view, /Lernziel hinzufügen/);
  assert.match(view, /portfolioRadarWerte/);
  assert.match(view, /setRadarValue/);
  assert.match(view, /axisGoals\.length : 0/);
  assert.match(view, /aria-label="Fach auswählen"/);
  assert.match(view, /aria-label="Kind auswählen"/);
  assert.match(view, /portfolioRadarAxes/);
  assert.match(view, /Anzahl Achsen/);
  assert.match(view, /changeAxisCount/);
  assert.match(flower, /axisCount/);
  assert.match(flower, /petals\.slice\(0, 8\)/);
  assert.match(view, /GOAL_STEPS\.map/);
  assert.match(view, /studentLernzielSemesterBewertungen/);
  assert.match(view, /notes: \[\.\.\.\(prev\.notes \|\| \[\]\)/);
});
