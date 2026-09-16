import test from 'node:test';
import assert from 'node:assert/strict';
import { addWeeklyLessonToEmptyYearPlan, hasWeeklyPlanningDetails, isYearPlanCellFree } from './planningSync';

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
