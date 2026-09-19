import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLernzielModell, STANDARD_LERNZIEL_MODELL, lernzielHaeufigkeiten,
  parseLernzielModell, pruefeModellWechsel, verwendeteLernzielStufen } from './lernzielBewertungsmodell';

test('legacy school-independent goal values are unchanged; unassessed is not a school grade', () => {
  const model = getLernzielModell(undefined);
  assert.deepEqual(model.levels.map(level => level.value), [3, 2, 1]);
  const result = lernzielHaeufigkeiten(['a', 'b', 'c', 'd'], { a: 1, b: 2, c: 3, d: null }, model);
  assert.deepEqual(result.counts.map(item => item.count), [1, 1, 1]);
  assert.equal(result.unassessed, 1);
  assert.equal(result.assessed, 3);
  assert.equal(result.total, 4);
});

test('2 to 10 named levels, order and diagrams can be configured without changing stable IDs', () => {
  const custom = parseLernzielModell({
    ...STANDARD_LERNZIEL_MODELL, name: 'Andere Schule', emptyLabel: 'Noch nicht beobachtet',
    levels: [
      { value: 3, label: 'Ich übe', kurz: 'Üben', color: '#ef4444', symbol: '🌱' },
      { value: 2, label: 'Ich kann es', kurz: 'Kann es', color: '#059669', symbol: '🌸' },
    ],
    views: { kind: 'sterne', parents: 'tabelle', teachers: 'ring' },
  });
  assert.equal(custom.levels.length, 2);
  assert.equal(custom.levels[0].value, 3);
  assert.equal(custom.views.parents, 'tabelle');
  assert.equal(lernzielHaeufigkeiten(['x'], { x: 1 }, custom).other, 1); // historic rating not silently converted
  assert.throws(() => parseLernzielModell({ ...custom, levels: [custom.levels[0]] }), /2 bis 10/);
  assert.throws(() => parseLernzielModell({ ...custom, levels: Array(11).fill(custom.levels[0]) }), /2 bis 10/);
  assert.throws(() => parseLernzielModell({ ...custom, levels: [custom.levels[0], custom.levels[0]] }), /eindeutige ID/);
  assert.throws(() => parseLernzielModell({ ...custom, levels: [{ ...custom.levels[0], color: 'url(javascript:evil)' }, custom.levels[1]] }), /gültige Farbe/);
  assert.throws(() => parseLernzielModell({ ...custom, views: { kind: 'bad', parents: 'ring', teachers: 'balken' } }), /Darstellung/);
});

test('used rating can only be removed after explicit student reassessment', () => {
  const used = verwendeteLernzielStufen(
    { a: { '1': { goal1: 1 }, '2': { goal2: 3 } }, b: { '1': { goal3: 2 } } },
    { c: { old: 1 } },
  );
  assert.deepEqual([...used].sort(), [1, 2, 3]);
  assert.throws(() => pruefeModellWechsel(STANDARD_LERNZIEL_MODELL,
    { ...STANDARD_LERNZIEL_MODELL, levels: STANDARD_LERNZIEL_MODELL.levels.slice(0, 2) }, used), /kann nicht entfernt/);
  const noHistoricUse = new Set([3, 2]);
  assert.doesNotThrow(() => pruefeModellWechsel(STANDARD_LERNZIEL_MODELL,
    { ...STANDARD_LERNZIEL_MODELL, levels: STANDARD_LERNZIEL_MODELL.levels.slice(0, 2) }, noHistoricUse));
  assert.throws(() => pruefeModellWechsel(STANDARD_LERNZIEL_MODELL,
    STANDARD_LERNZIEL_MODELL, new Set([98])), /alte Einschätzungen/);
});

test('integration: active class, backup, print and student dossier preserve selectable learning goal scale', () => {
  const state = readFileSync('src/lib/appState.ts', 'utf8');
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
  const goals = readFileSync('src/components/StudentLernziele.tsx', 'utf8');
  const overview = readFileSync('src/components/Portfolio.tsx', 'utf8');
  for (const source of [state, context]) assert.match(source, /lernzielBewertungsmodell:/);
  assert.match(state, /lernzielBewertungsmodell: state\.lernzielBewertungsmodell/);
  assert.match(state, /lernzielBewertungsmodell: targetClass\.lernzielBewertungsmodell/);
  assert.match(state, /parsed\.lernzielBewertungsmodell = activeClass\.lernzielBewertungsmodell/);
  assert.match(dossier, /<StudentPortfolio key=\{student\.id\} schuelerId=\{student\.id\}/);
  assert.match(goals, /goalModel\.levels\.map\(level =>/);
  assert.match(goals, /const ratingLabel = rating === null/);
  assert.doesNotMatch(goals, /rating === 1 \? 'Erreicht'/);
  assert.match(overview, /<LernzielModellEditor/);
});


test('changing classes retains separate scales, historic ratings and old JSON backup compatibility', async () => {
  const { initialAppState, syncActiveClass, switchClassState, normalizeAppState } = await import('./appState');
  const custom = parseLernzielModell({
    ...STANDARD_LERNZIEL_MODELL, name: 'Klasse A',
    levels: [
      { value: 3, label: 'Start', kurz: 'Start', color: '#d97706', symbol: '🌱' },
      { value: 2, label: 'Fast', kurz: 'Fast', color: '#4d7c0f', symbol: '🌿' },
      { value: 1, label: 'Sicher', kurz: 'Sicher', color: '#047857', symbol: '🌸' },
    ],
  });
  const firstClass = { id: 'a', name: 'A', stufe: 1, klassenvorstand: true, schueler: [], lernzielBewertungsmodell: custom };
  const secondClass = { id: 'b', name: 'B', stufe: 2, klassenvorstand: true, schueler: [] };
  const state = {
    ...initialAppState,
    activeClassId: 'a', klassenbezeichnung: 'A', stufe: 1, klassenvorstand: true,
    lernzielBewertungsmodell: custom,
    studentLernzielSemesterBewertungen: { pupilA: { '1': { goal1: 1 } } },
    classes: [firstClass, secondClass],
  } as any;
  const switched = switchClassState(state, 'b');
  assert.equal(switched.lernzielBewertungsmodell, undefined);
  assert.deepEqual(switched.studentLernzielSemesterBewertungen, {});
  const back = switchClassState(switched, 'a');
  assert.equal(back.lernzielBewertungsmodell?.name, 'Klasse A');
  assert.equal(back.studentLernzielSemesterBewertungen?.pupilA?.['1']?.goal1, 1);
  const restored = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(back))));
  assert.equal(restored.lernzielBewertungsmodell?.name, 'Klasse A');
  assert.equal(restored.classes.find(c => c.id === 'b')?.lernzielBewertungsmodell, undefined);
  const oldBackup = normalizeAppState({ ...initialAppState, lernzielBewertungsmodell: undefined, classes: [] });
  assert.deepEqual(getLernzielModell(oldBackup.lernzielBewertungsmodell).levels.map(l => l.value), [3, 2, 1]);
});

test('school rubric is separate: learning-goal explanation does not overwrite Oberau matrix', () => {
  const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
  const explanation = readFileSync('src/components/dossier/DossierLernzielErlaeuterung.tsx', 'utf8');
  assert.match(dossier, /id: 'lernziel_erlaeuterung'/);
  assert.match(dossier, /<DossierLernzielErlaeuterung student=\{student\} semester=\{sem\}/);
  assert.match(explanation, /lernzielErlaeuterungen:/);
  assert.doesNotMatch(explanation, /erlaeuterungsmatrix\s*:/);
  assert.match(explanation, /Kein amtliches Zeugnis/);
});
