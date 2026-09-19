import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateClassOverviewStats } from './classOverviewStats';
import type { Student } from '../types';

const child = (patch: Partial<Student>): Student => ({
  id: crypto.randomUUID(), vorname: 'Test', nachname: 'Kind', name: 'Test Kind',
  niveau: 1, notiz: '', geburtstag: '', staatsbuergerschaft: '',
  religion: '', besuchsjahr: '', espf: false, spf: false,
  erstsprache: '', geschlecht: '', gruppen: [], ...patch,
});

test('Klassenstatistik zählt vorhandene Erst-/Zweitsprachen, Religionen und unbekannte Werte', () => {
  const rows = [
    child({ erstsprache: 'Deutsch', zweitsprache: 'Türkisch', religion: 'o.B.', daz: true, spf: true }),
    child({ erstsprache: 'Arabisch', zweitsprache: 'deutsch', religion: 'Islam', daz: true, espf: true }),
    child({ erstsprache: 'Deutsch', zweitsprache: '', religion: '', daz: true }),
  ];
  const stats = calculateClassOverviewStats(rows);
  assert.equal(stats.total, 3);
  assert.equal(stats.germanFirstLanguage, 2);
  assert.equal(stats.germanSecondLanguage, 1);
  assert.equal(stats.daz, 3);
  assert.equal(stats.spf, 1);
  assert.equal(stats.espf, 1);
  assert.ok(stats.secondLanguages.some(row => row.label === 'Nicht erfasst' && row.count === 1));
  assert.ok(stats.religions.some(row => row.label === 'Nicht erfasst' && row.count === 1));
});

test('Klassenstatistik erfindet kein Deutsch als Zweitsprache aus DaZ oder fehlendem Sprachfeld', () => {
  const stats = calculateClassOverviewStats([child({ daz: true, erstsprache: 'Bosnisch' })]);
  assert.equal(stats.germanSecondLanguage, 0);
  assert.equal(stats.daz, 1);
  assert.equal(stats.ages.average, '–');
  assert.equal(stats.ages.recorded, 0);
});
