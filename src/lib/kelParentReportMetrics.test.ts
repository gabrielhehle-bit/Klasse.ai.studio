import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeKelMood, summarizeKelBehavior } from './kelParentReportMetrics';

test('KEL wellbeing chart counts every valid 1–5 answer in the selected period exactly once', () => {
  const input = {
    '2026-10-25': 1,
    '2026-11-01': 1,
    '2026-11-02': 2,
    '2026-11-03': 2,
    '2026-11-04': '2',
    '2026-11-05': 3,
    '2026-11-06': 4,
    '2026-11-07': 5,
    '2026-11-08': 2.5,
    '2026-11-09': false,
    '2026-11-10': 6,
    '2026-12-01': 2,
  };
  const summary = summarizeKelMood(input, '2026-11-01', '2026-11-30');
  assert.deepEqual(summary.counts, [1, 3, 1, 1, 1]);
  assert.deepEqual(summary.percentages, [14, 43, 14, 14, 14]);
  assert.equal(summary.total, 7);
  assert.equal(summary.positiveCount, 4);
  assert.equal(summary.average, 19 / 7);
  assert.equal(summary.mostFrequent, 2);
  assert.equal(input['2026-11-02'], 2, 'source records stay untouched');
});

test('empty and tied wellbeing data are not interpreted as a single dominant mood', () => {
  assert.equal(summarizeKelMood(null, '2026-11-01', '2026-11-30').average, null);
  const summary = summarizeKelMood({'2026-11-03': 1, '2026-11-04': 2}, '2026-11-01', '2026-11-30');
  assert.equal(summary.mostFrequent, null);
  assert.equal(summary.positiveCount, 2);
});

test('behavior breakdown is based on existing category labels, counts and percentages, not fabricated judgements', () => {
  const stages = [
    { id: 'good', label: 'Gut', color: '#00aa55' },
    { id: 'ok', label: 'OK', color: '#aa9955' },
  ];
  const logs = [...Array.from({length:18}, () => ({iconId: 'good'})), ...Array.from({length:3}, () => ({iconId: 'ok'}))];
  const summary = summarizeKelBehavior(logs, stages);
  assert.equal(summary.total, 21);
  assert.deepEqual(summary.rows.map(row => [row.label,row.count,row.percent]), [
    ['Gut',18,86], ['OK',3,14],
  ]);
  assert.equal(summary.leading?.label, 'Gut');
});

test('behavior charts preserve uncategorized legacy entries and do not invent a leader on ties', () => {
  const stages = [{id:'a',label:'A'}, {id:'b',label:'B'}];
  const summary = summarizeKelBehavior([{iconId:'a'}, {iconId:'b'}, {iconId:'former'}], stages);
  assert.equal(summary.total, 3);
  assert.equal(summary.leading, null);
  assert.equal(summary.rows.find(row=>row.label==='Nicht zugeordnet')?.count, 1);
});

test('signature boxes have 34mm usable handwriting height and a date field in both preview and print', () => {
  const report = readFileSync('src/components/KELParentReport.tsx','utf8');
  const print = readFileSync('src/components/PrintCenter.tsx','utf8');
  assert.match(report, /data-kel-signatures/);
  assert.match(report, /data-kel-signature-field/);
  assert.match(report, /data-kel-signature-space/);
  assert.match(report, /min-h-\[34mm\]/);
  assert.match(report, /Erziehungsberechtigte/);
  assert.match(report, /Lehrperson/);
  assert.match(report, /Ort \/ Datum/);
  assert.match(print, /\[data-kel-signature-space\] \{/);
  assert.match(print, /height: 34mm !important;/);
});

test('the parent printout never asserts behavior severity from a custom label', () => {
  const report = readFileSync('src/components/KELParentReport.tsx','utf8');
  assert.match(report,/Anteil an dokumentierten Tageswerten/);
  assert.match(report,/mood\.counts\[index\]/);
  assert.match(report,/row\.percent/);
  assert.match(report,/Keine dokumentierten Verhaltensereignisse/);
  assert.doesNotMatch(report,/überwiegend positive Einträge|Sozialverhalten insgesamt stabil/);
});

test('explicitly released learning areas remain pageable while every signature stays together', () => {
  const report = readFileSync('src/components/KELParentReport.tsx', 'utf8');
  const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');
  assert.match(report, /<Section title="Lernen" detail="Ganzes Schuljahr" allowPageBreak>/);
  assert.match(report, /data-kel-learning-item/);
  assert.match(report, /subject\.rows\.map\(\(row, index\)/);
  assert.doesNotMatch(report, /subject\.rows\.slice\(0, 4\)/);
  assert.match(print, /\[data-kel-learning-section\] \{/);
  assert.match(print, /break-inside: auto !important;/);
  assert.match(print, /\[data-kel-learning-item\] \{/);
  assert.match(print, /page-break-inside: avoid !important;/);
});
