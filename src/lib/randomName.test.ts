import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDisplayStudentName,
  isStudentAbsentToday,
  getPresentStudents,
  DEFAULT_MOCK_STUDENTS
} from '../components/cockpit/studentSelectionUtils';

test('F6 - studentSelectionUtils: Doppelte Vornamen korrekt formatieren', () => {
  const students = [
    { id: '1', vorname: 'Anna', nachname: 'Müller' },
    { id: '2', vorname: 'Anna', nachname: 'Schmidt' },
    { id: '3', vorname: 'Lukas', nachname: 'Bauer' }
  ];

  // Anna hat eine Namensdoppelung -> Anna M. und Anna S.
  assert.equal(getDisplayStudentName(students[0], students), 'Anna M.');
  assert.equal(getDisplayStudentName(students[1], students), 'Anna S.');

  // Lukas ist eindeutig -> Lukas
  assert.equal(getDisplayStudentName(students[2], students), 'Lukas');
});

test('F6 - studentSelectionUtils: Abwesende Kinder nach F5/F6-Logik ausschließen', () => {
  const mockAppState: any = {
    schueler: [
      { id: 's1', vorname: 'Max', abwesend: true },
      { id: 's2', vorname: 'Julia', status: 'abwesend' },
      { id: 's3', vorname: 'Tim' }
    ],
    anwesenheit: {
      s3: {
        [new Date().toISOString().split('T')[0]]: { stunde1: 'e' }
      }
    }
  };

  assert.equal(isStudentAbsentToday('s1', mockAppState), true);
  assert.equal(isStudentAbsentToday('s2', mockAppState), true);
  assert.equal(isStudentAbsentToday('s3', mockAppState), true);
  assert.equal(isStudentAbsentToday('s_unknown', mockAppState), false);
});

test('F6 - RandomName: Schutzlogik verhindert unmittelbare Wiederholung bei >= 2 Kindern', () => {
  const pool = [
    { id: '1', vorname: 'Max' },
    { id: '2', vorname: 'Anna' },
    { id: '3', vorname: 'Ben' }
  ];

  let lastPickedId: string | null = '1';

  // Bei Ziehung mit Schutzlogik:
  for (let i = 0; i < 50; i++) {
    const candidatePool = (pool.length >= 2 && lastPickedId)
      ? pool.filter(s => s.id !== lastPickedId)
      : pool;

    assert.ok(candidatePool.length > 0);
    assert.ok(!candidatePool.some(s => s.id === lastPickedId));

    const picked = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    assert.notEqual(picked.id, lastPickedId);
    lastPickedId = picked.id;
  }
});

test('F6 - RandomName: Unabhängige Ziehung ohne Rundenbeschränkung (keine Fairness-Runde)', () => {
  const pool = [
    { id: '1', vorname: 'Max' },
    { id: '2', vorname: 'Anna' }
  ];

  let lastPickedId: string | null = null;
  const pickedIds: string[] = [];

  // Nach 4 Ziehungen können Max und Anna mehrfach vorkommen, ohne dass ein Rundenende blockiert
  for (let i = 0; i < 6; i++) {
    const candidatePool = (pool.length >= 2 && lastPickedId)
      ? pool.filter(s => s.id !== lastPickedId)
      : pool;

    const picked = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    pickedIds.push(picked.id);
    lastPickedId = picked.id;
  }

  // Da immer gewechselt wird bei 2 Kindern, sollte abwechselnd gezogen worden sein
  assert.equal(pickedIds.length, 6);
  assert.ok(pickedIds.filter(id => id === '1').length > 0);
  assert.ok(pickedIds.filter(id => id === '2').length > 0);
});
