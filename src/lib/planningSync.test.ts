import test from 'node:test';
import assert from 'node:assert/strict';
import { addWeeklyLessonToEmptyYearPlan, addWeeklyLessonsToYearPlan, hasWeeklyPlanningDetails, isYearPlanCellFree } from './planningSync';

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
