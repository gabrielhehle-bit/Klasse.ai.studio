import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync('src/components/KELParentTrendChart.tsx', 'utf8');
const report = readFileSync('src/components/KELParentReport.tsx', 'utf8');
const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');

test('both parent-facing timelines use the same dossier data and selected reporting period', () => {
  assert.match(report, /buildKelParentTrend\(\s*options\.period, stats\.start, stats\.today,/);
  assert.match(report, /app\.schuelerStimmung\?\.\[studentId\], stats\.logs, stats\.stages/);
  assert.match(report, /<KELParentTrendChart kind="mood" buckets=\{trend\.buckets\} period=\{options\.period\} \/>/);
  assert.match(report, /<KELParentTrendChart kind="behavior" buckets=\{trend\.buckets\} period=\{options\.period\} behaviorRows=\{behaviorRows\} \/>/);
  assert.doesNotMatch(report, /setApp\(/);
});

test('wellbeing SVG explicitly keeps gaps in weeks with no self-assessment', () => {
  assert.match(component, /observed\.length === 0/);
  assert.match(component, /observed\.length === 1/);
  assert.match(component, /Noch keine Entwicklung ablesbar/);
  assert.match(component, /current !== null && previous\?\.moodAverage != null/);
  assert.match(component, /current !== null && \(/);
  assert.match(component, /data-kel-mood-trend/);
  assert.match(component, /Leere Abschnitte sind keine Rückmeldung/);
  assert.doesNotMatch(component, /interpolate|linearRegression/);
});

test('behavior trend counts documented days and never assigns a positive or negative behavior score', () => {
  assert.match(component, /data-kel-behavior-trend/);
  assert.match(component, /bucket\.behaviorCount/);
  assert.match(component, /bucket\.behaviorByStage/);
  assert.match(component, /segments\.map\(row =>/);
  assert.match(component, /fill=\{row\.color\}/);
  assert.match(component, /Die Farben zeigen die dokumentierten Kategorien/);
  assert.match(component, /Weniger Einträge bedeuten nicht automatisch besseres Verhalten/);
  assert.match(component, /Anzahl dokumentierter Tageswerte/);
});

test('Chrome PDF preserves both SVG trends without altering the protected signature fields', () => {
  assert.match(print, /\[data-kel-mood-trend\],/);
  assert.match(print, /\[data-kel-behavior-trend\] \{/);
  assert.match(print, /height: 72px !important;/);
  assert.match(print, /\[data-kel-trend\] \{/);
  assert.match(print, /page-break-inside: avoid !important;/);
  assert.match(print, /\[data-kel-signature-space\] \{/);
  assert.match(print, /height: 34mm !important;/);
});

test('PrintCenter offers KEL parents a direct entry and one unambiguous print/PDF action', () => {
  assert.match(print, /\{ id: 'kel_elternblatt', label: 'KEL-Elternblatt', desc: 'Elterngespräch auf A4'/);
  assert.match(print, /data-testid="print-center-advanced-format"/);
  assert.match(print, /<details data-testid="print-center-advanced-format"/);
  assert.match(print, /Angaben für dieses Dokument/);
  assert.match(print, /data-testid="print-center-primary-print"/);
  assert.match(print, /Drucken oder als PDF speichern/);
  assert.match(print, /Im Browser-Druckdialog den Drucker wählen/);
});
