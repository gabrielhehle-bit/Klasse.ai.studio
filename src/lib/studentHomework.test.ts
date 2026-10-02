import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentHomeworkSummary } from './studentHomework';

test('Hausübungen: dokumentierter Fehlstand wird aus derselben Notenmappe gelesen', () => {
  const app: any = {
    noten: {
      s1: {
        Deutsch: {
          '1': { hue: 3, hueAnm: ['2x nachgebracht'], hueErfasst: true },
        },
      },
    },
    notenMeta: {
      Deutsch: { hueMode: 'grade', hueDeduction: 5, hueMitarbeitWeight: 1 },
    },
    settings: {},
  };

  const summary = getStudentHomeworkSummary(app, 's1', 'Deutsch');

  assert.equal(summary.missing, 3);
  assert.equal(summary.note, '2x nachgebracht');
  assert.equal(summary.tracked, true);
  assert.equal(summary.percent, 85);
  assert.equal(summary.calculatedGrade, 2);
  assert.equal(summary.mode, 'grade');
});

test('Hausübungen: Dokumentationsmodus zeigt keine berechnete Bewertung', () => {
  const app: any = {
    noten: {
      s1: {
        Mathematik: {
          '1': { hue: 1, hueAnm: [], hueErfasst: true },
        },
      },
    },
    notenMeta: {
      Mathematik: { hueMode: 'document', hueDeduction: 10 },
    },
    settings: {},
  };

  const summary = getStudentHomeworkSummary(app, 's1', 'Mathematik');

  assert.equal(summary.missing, 1);
  assert.equal(summary.tracked, true);
  assert.equal(summary.percent, null);
  assert.equal(summary.calculatedGrade, null);
  assert.equal(summary.mode, 'document');
});

test('Hausübungen: nicht erfasst bleibt von null fehlenden Hausübungen unterscheidbar', () => {
  const app: any = {
    noten: {
      s1: {
        Deutsch: {
          '1': { hue: 0, hueAnm: [] },
        },
      },
    },
    notenMeta: {},
    settings: {},
  };

  const summary = getStudentHomeworkSummary(app, 's1', 'Deutsch');

  assert.equal(summary.missing, 0);
  assert.equal(summary.tracked, false);
});
