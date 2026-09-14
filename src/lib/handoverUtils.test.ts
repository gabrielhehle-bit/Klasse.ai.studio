import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTransferGradeValue,
  getHandoverLessonPlans,
  getHandoverLessonTime,
  materialToHandoverLessonPlan,
  toLocalDateInputValue,
} from './handoverUtils';

const material = {
  id: 'm1',
  titel: 'Lesen',
  beschreibung: 'Ablauf',
  typ: 'stundenentwurf',
  faecher: ['Deutsch'],
  schulstufen: [3],
  tags: ['Lesen'],
  erstelltAm: '2026-09-14T00:00:00.000Z',
  favorit: true,
  kiGeneriert: false,
  dauer: 50,
  schwierigkeit: 'einfach',
  lernziel: 'Flüssig lesen',
  benoetigtesMaterial: ['Buch'],
  istEigeneVorlage: true,
} as any;

test('handover lesson plans normalize MaterialItem subject metadata', () => {
  const result = materialToHandoverLessonPlan(material);
  assert.ok(result);
  assert.equal(result?.fach, 'Deutsch');
  assert.equal(result?.dauer, 50);
  assert.deepEqual(result?.schulstufen, [3]);
  assert.deepEqual(result?.benoetigtesMaterial, ['Buch']);
});

test('handover lesson plan list ignores unrelated library material', () => {
  const result = getHandoverLessonPlans([
    material,
    { ...material, id: 'n1', typ: 'notiz' },
  ] as any);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'm1');
});

test('handover lesson plan normalization provides safe legacy defaults', () => {
  const result = materialToHandoverLessonPlan({
    ...material,
    faecher: [],
    schulstufen: undefined,
    tags: undefined,
    dauer: undefined,
    schwierigkeit: undefined,
    benoetigtesMaterial: undefined,
    lernziel: undefined,
  } as any);
  assert.equal(result?.fach, 'Unterricht');
  assert.equal(result?.dauer, 45);
  assert.equal(result?.schwierigkeit, 'mittel');
  assert.deepEqual(result?.schulstufen, []);
  assert.deepEqual(result?.tags, []);
});

test('handover lesson times prefer class configuration and never invent slot 9 or 10 times', () => {
  assert.equal(getHandoverLessonTime({ 1: '07:50–08:40' }, { 1: '08:00–08:50' }, 1), '07:50–08:40');
  assert.equal(getHandoverLessonTime(undefined, { 8: '15:10–16:00' }, 8), '15:10–16:00');
  assert.equal(getHandoverLessonTime(undefined, { 8: '15:10–16:00' }, 9), '—');
  assert.equal(getHandoverLessonTime(undefined, { 8: '15:10–16:00' }, 10), '—');
});

test('transfer grade formatting is honest for grades and percentage-like overall values', () => {
  assert.equal(formatTransferGradeValue(1.75, 'grades'), '1,75');
  assert.equal(formatTransferGradeValue(82.5, 'percent'), '82,5 %');
  assert.equal(formatTransferGradeValue(76, 'points'), '76 %');
  assert.equal(formatTransferGradeValue(null, 'grades'), '—');
  assert.equal(formatTransferGradeValue('SPF', 'grades'), 'SPF');
});


test('handover date inputs use the local calendar day instead of UTC serialization', () => {
  const local = new Date(2026, 8, 14, 0, 30, 0);
  assert.equal(toLocalDateInputValue(local), '2026-09-14');
});
