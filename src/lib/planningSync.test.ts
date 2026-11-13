import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addWeeklyLessonToEmptyYearPlan, addWeeklyLessonsToYearPlan, buildYearlyAiTimetable, hasWeeklyPlanningDetails, isYearPlanCellFree, mergeYearlyAssignmentsIntoWeeklyWeek } from './planningSync';

test('Wochenplan → Jahresplan: leeres Fach der gleichen KW wird sicher ergänzt', () => {
  const result = addWeeklyLessonToEmptyYearPlan({
    existingPlan: {},
    kw: 38,
    lesson: {
      fach: 'Mathematik',
      thema: 'Zahlenraum bis 20',
      material: 'Buch S. 12–13',
      type: 'standard',
      schwerpunkte: ['Mathematik (Zahlen & Daten)'],
    },
    availableSubjects: [
      { id: 'deutsch', label: 'Deutsch' },
      { id: 'mathematik', label: 'Mathematik' },
    ],
  });

  assert.equal(result.status, 'added');
  assert.equal(result.subjectId, 'mathematik');
  assert.equal(result.plan[38].mathematik.thema, 'Zahlenraum bis 20');
  assert.equal(result.plan[38].mathematik.buch, 'Buch S. 12–13');
  assert.deepEqual(result.plan[38].mathematik.subCategories, ['Mathematik (Zahlen & Daten)']);
});

test('Wochenplan → Jahresplan überschreibt niemals eine bereits geplante Jahresplan-Zelle', () => {
  const existing = {
    38: {
      mathematik: {
        thema: 'Bestehendes Jahresthema',
        buch: '',
        type: 'standard',
        items: [],
      },
    },
  };

  const result = addWeeklyLessonToEmptyYearPlan({
    existingPlan: existing,
    kw: 38,
    lesson: { fach: 'Mathematik', thema: 'Neue Wochenplanung' },
    availableSubjects: [{ id: 'mathematik', label: 'Mathematik' }],
  });

  assert.equal(result.status, 'occupied');
  assert.equal(result.plan, existing);
  assert.equal(result.plan[38].mathematik.thema, 'Bestehendes Jahresthema');
});

test('Wochenplan → Jahresplan verlangt ein echtes Thema und eine auflösbare Fachspalte', () => {
  const noTopic = addWeeklyLessonToEmptyYearPlan({
    existingPlan: {},
    kw: 38,
    lesson: { fach: 'Deutsch', thema: '   ' },
    availableSubjects: [{ id: 'deutsch', label: 'Deutsch' }],
  });
  assert.equal(noTopic.status, 'missing-topic');

  const noSubject = addWeeklyLessonToEmptyYearPlan({
    existingPlan: {},
    kw: 38,
    lesson: { fach: 'Unbekannt', thema: 'Thema' },
    availableSubjects: [{ id: 'deutsch', label: 'Deutsch' }],
  });
  assert.equal(noSubject.status, 'missing-subject');
});

test('Planungsübersicht gilt nur für tatsächlich geplante Wochenstunden', () => {
  assert.equal(hasWeeklyPlanningDetails({ fach: 'Mathematik' }), false);
  assert.equal(hasWeeklyPlanningDetails({ fach: 'Mathematik', thema: 'Plusaufgaben' }), true);
  assert.equal(hasWeeklyPlanningDetails({ fach: 'Mathematik', materialIds: ['mat-1'] }), true);
  assert.equal(hasWeeklyPlanningDetails({ fach: 'Mathematik', halves: { enabled: true } }), true);
});

test('Jahresplan-Zelle gilt nur ohne Inhalte oder Termin-Typ als frei', () => {
  assert.equal(isYearPlanCellFree(undefined), true);
  assert.equal(isYearPlanCellFree({ thema: '', type: 'standard', items: [] }), true);
  assert.equal(isYearPlanCellFree({ thema: 'Nomen', type: 'standard', items: [] }), false);
  assert.equal(isYearPlanCellFree({ thema: '', type: 'event', items: [] }), false);
});

test('Mehrfachübernahme bewahrt vorhandene Jahresthemen und trennt unterschiedliche Deutsch-Bereiche', () => {
  const original = { 38: { deutsch: { thema: 'Vorhandenes Jahresthema', buch: 'S. 1', type: 'standard', items: [] } } };
  const frozen = JSON.stringify(original);
  const params = {
    existingPlan: original,
    kw: 38,
    availableSubjects: [{ id: 'deutsch', label: 'Deutsch' }, { id: 'mathematik', label: 'Mathematik' }],
    selections: [
      { lesson: { fach: 'Deutsch', thema: 'Lesewoche', schwerpunkte: ['Deutsch (Lesen)'] } },
      { lesson: { fach: 'Deutsch', thema: 'Lesewoche', schwerpunkte: ['Deutsch (Rechtschreibung)'] } },
      { lesson: { fach: 'Mathematik', thema: 'Zahlenraum bis 20', material: 'AH S. 4' } },
    ],
  };
  const result = addWeeklyLessonsToYearPlan(params);
  assert.equal(result.added, 3);
  assert.equal(JSON.stringify(original), frozen, 'gespeicherter Eingangsplan bleibt unverändert');
  assert.deepEqual(result.plan[38].deutsch.items?.map(item => item.thema),
    ['Vorhandenes Jahresthema', 'Lesewoche', 'Lesewoche']);
  assert.deepEqual(result.plan[38].deutsch.items?.slice(1).map(item => item.subCategories),
    [['Deutsch (Lesen)'], ['Deutsch (Rechtschreibung)']]);
  assert.equal(result.plan[38].mathematik.thema, 'Zahlenraum bis 20');
  const second = addWeeklyLessonsToYearPlan({ ...params, existingPlan: result.plan });
  assert.equal(second.added, 0);
  assert.equal(second.alreadyPresent, 3);
  assert.equal(second.plan, result.plan);
});

test('Mehrfachübernahme überspringt unbekannte Fächer, leere Themen und terminbesetzte Zellen', () => {
  const original = { 38: { deutsch: { thema: '', type: 'event', items: [] } } };
  const result = addWeeklyLessonsToYearPlan({
    existingPlan: original, kw: 38, availableSubjects: [{ id: 'deutsch', label: 'Deutsch' }],
    selections: [
      { lesson: { fach: 'Deutsch', thema: 'Lesen' } },
      { lesson: { fach: 'Englisch', thema: 'Hello' } },
      { lesson: { fach: 'Deutsch', thema: '  ' } },
    ],
  });
  assert.equal(result.added, 0);
  assert.equal(result.skipped, 3);
  assert.equal(result.plan, original);
});

test('Jahresplan-KI: Stammplanvorlage bleibt rein lesend und überschreibt keine Wochenplanstunden', () => {
  const saved = { Montag: { 0: { fach: 'Deutsch', thema: 'Eigene Lesestunde', material: 'Karten' } } };
  const stamm = { Montag: { 1: 'Mathematik', 2: 'Sachunterricht' }, Dienstag: { 3: 'Musik' } };
  const original = structuredClone(saved);
  const template = buildYearlyAiTimetable(saved, stamm);
  assert.deepEqual(saved, original);
  assert.notEqual(template.Montag, saved.Montag);
  assert.equal(template.Montag[0].fach, 'Deutsch', 'existing weekly subject overrides Stammplan');
  assert.equal(template.Montag[1].fach, 'Sachunterricht');
  assert.equal(template.Dienstag[2].fach, 'Musik');
  assert.deepEqual(saved, original, 'prompt preparation must not write to live state');
});

test('Jahresplan-KI: vorhandene Unterrichtsthemen, Hausübungen und Kind-Aufgaben werden nicht ersetzt', () => {
  const saved = { Montag: {
    0: { fach: 'Deutsch', thema: 'Eigenes Thema', housework: 'S. 9', erledigt: true },
    1: { fach: 'Mathematik', thema: '', material: 'Dienes-Würfel', imKinderWochenplan: true },
    2: { fach: 'Sachunterricht', thema: '', notiz: 'Elterninfo' },
    3: { fach: 'Religion', thema: '', erledigt: true },
  } };
  const before = structuredClone(saved);
  const template = buildYearlyAiTimetable(saved, {
    Montag: { 1: 'Deutsch', 2: 'Mathematik', 3: 'Sachunterricht', 4: 'Religion' },
  });
  const result = mergeYearlyAssignmentsIntoWeeklyWeek({
    existingWeek: saved, timetableWeek: template,
    assignments: [
      { tag: 'Montag', idx: 0, thema: 'KI ersetzt nicht die Lehrkraft' },
      { tag: 'Montag', idx: 1, thema: 'KI ersetzt nicht Material' },
      { tag: 'Montag', idx: 2, thema: 'KI ersetzt nicht Notizen' },
      { tag: 'Montag', idx: 3, thema: 'KI setzt erledigte Stunde nicht zurück' },
    ],
  });
  assert.equal(result.added, 0);
  assert.equal(result.skipped, 4);
  assert.equal(result.week, saved);
  assert.deepEqual(saved, before);
});

test('Jahresplan-KI: nur wirklich freie Fachstunden erhalten Themen; Wiederholung bleibt idempotent', () => {
  const saved = { Montag: { 0: { fach: 'Deutsch', erledigt: false } } };
  const frozen = structuredClone(saved);
  const template = buildYearlyAiTimetable(saved, { Montag: { 1: 'Deutsch', 2: 'Mathematik' } });
  const assignments = [
    { tag: 'Montag', idx: 0, thema: 'Silben lesen', buch: 'S. 20', subCategories: ['Deutsch (Lesen)'] },
    { tag: 'Montag', idx: 1, thema: 'Zahlenraum 20', buch: 'AH S. 12', type: 'standard' },
    { tag: 'Montag', idx: 0, thema: 'Anderer KI-Vorschlag' },
  ];
  const first = mergeYearlyAssignmentsIntoWeeklyWeek({ existingWeek: saved, timetableWeek: template, assignments });
  assert.equal(first.added, 2);
  assert.equal(first.skipped, 1);
  assert.equal(first.week.Montag[0].thema, 'Silben lesen');
  assert.equal(first.week.Montag[0].erledigt, false);
  assert.deepEqual(first.week.Montag[0].schwerpunkte, ['Deutsch (Lesen)']);
  assert.equal(first.week.Montag[1].fach, 'Mathematik');
  assert.equal(first.week.Montag[1].thema, 'Zahlenraum 20');
  assert.deepEqual(saved, frozen);
  assert.notEqual(first.week.Montag, saved.Montag);

  const second = mergeYearlyAssignmentsIntoWeeklyWeek({
    existingWeek: first.week,
    timetableWeek: buildYearlyAiTimetable(first.week, { Montag: { 1: 'Deutsch', 2: 'Mathematik' } }),
    assignments,
  });
  assert.equal(second.added, 0);
  assert.equal(second.week, first.week);
});

test('Jahresplan-KI: kein Fantasiestundenplan, keine fachfremden oder ungültigen Zuweisungen', () => {
  const saved = { Dienstag: { 2: { fach: 'Musik' } } };
  const template = { Dienstag: { 2: { fach: 'Deutsch' } } }; // outdated template after teacher changed subject
  const result = mergeYearlyAssignmentsIntoWeeklyWeek({
    existingWeek: saved, timetableWeek: template,
    assignments: [
      { tag: 'Sonntag', idx: 2, thema: 'Sonntag ist kein Schultag' },
      { tag: 'Dienstag', idx: 10, thema: 'Außerhalb Stundenplan' },
      { tag: 'Dienstag', idx: 3, thema: 'Ohne eingetragenes Fach' },
      { tag: 'Dienstag', idx: 2, thema: 'Unpassendes Fach im geänderten Wochenplan' },
      { tag: 'Dienstag', idx: 2, thema: '   ' },
    ],
  });
  assert.equal(result.added, 0);
  assert.equal(result.skipped, 5);
  assert.equal(result.week, saved);
});

test('Jahresplan-KI: der produktive Wochenplan speichert nur sichere Merges aus dem neuesten Zustand', () => {
  const source = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  assert.match(source, /buildYearlyAiTimetable\(existingWeek, prev\.stammplan\)/);
  assert.match(source, /mergeYearlyAssignmentsIntoWeeklyWeek\(\{/);
  assert.match(source, /if \(result\.added === 0\) return prev/);
  assert.match(source, /prev\.currentKW !== activeKW\) return prev/);
  assert.doesNotMatch(source, /lesson\.thema = assign\.thema/);
});
