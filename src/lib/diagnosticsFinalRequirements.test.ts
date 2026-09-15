import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const container = readFileSync('src/components/diagnostics/DiagnosticContainer.tsx', 'utf8');
const diagnosticClass = readFileSync('src/components/diagnostics/DiagnosticClass.tsx', 'utf8');
const screeningRunner = readFileSync('src/components/diagnostics/screening/DiagnosticScreeningRunner.tsx', 'utf8');
const screeningSetup = readFileSync('src/components/diagnostics/screening/DiagnosticScreeningSetup.tsx', 'utf8');
const screeningPreview = readFileSync('src/components/diagnostics/screening/DiagnosticScreeningPreview.tsx', 'utf8');
const resultReview = readFileSync('src/components/diagnostics/runner/DiagnosticResultReview.tsx', 'utf8');
const coreUtils = readFileSync('src/lib/diagnosticCoreUtils.ts', 'utf8');
const evaluation = readFileSync('src/lib/diagnosticEvaluation.ts', 'utf8');
const legacy = readFileSync('src/components/DiagnostikLegacy.tsx', 'utf8');

test('Diagnostik: Klassenwechsel setzt offene Auswahl und Ansicht zurück', () => {
  assert.match(container, /useEffect\(\(\) => \{/);
  assert.match(container, /setView\('home'\)/);
  assert.match(container, /setSelectedStudentIdForTest\(undefined\)/);
  assert.match(container, /setSelectedCompetencyIdForTest\(undefined\)/);
  assert.match(container, /setSelectedGradeLevelForTest\(undefined\)/);
  assert.match(container, /\}, \[app\.activeClassId\]\)/);
});

test('Diagnostik: neue Ergebnisse werden strikt an die aktive Klasse gebunden', () => {
  assert.match(container, /const activeClassId = app\.activeClassId \|\| undefined/);
  assert.match(container, /result\.classId !== activeClassId/);
  assert.match(container, /students\.some\(student => student\.id === result\.studentId\)/);
  assert.match(container, /activeClassId=\{activeClassId\}/);

  assert.match(diagnosticClass, /activeClassId\?: string/);
  assert.match(diagnosticClass, /classId: activeClassId/);
  assert.doesNotMatch(diagnosticClass, /klasse-default/);
  assert.doesNotMatch(diagnosticClass, /\(student as any\)\.klasse/);

  assert.match(resultReview, /if \(!app\.activeClassId\)/);
  assert.match(resultReview, /classId: app\.activeClassId/);
  assert.doesNotMatch(resultReview, /getDiagnosticClassId\(app\)/);
});

test('Diagnostik: Screening zeigt keine erfundene Beispielklasse 2a', () => {
  for (const [name, source] of [
    ['Runner', screeningRunner],
    ['Setup', screeningSetup],
    ['Vorschau', screeningPreview],
  ] as const) {
    assert.ok(!source.includes("'2a'"), `${name} enthält noch den Fallback '2a'`);
    assert.ok(!source.includes('"2a"'), `${name} enthält noch den Fallback "2a"`);
  }

  assert.match(screeningRunner, /activeClassName \|\| 'Aktuelle Klasse'/);
  assert.match(screeningSetup, /activeClassName \|\| 'Aktuelle Klasse'/);
  assert.match(screeningPreview, /activeClassName \|\| 'Aktuelle Klasse'/);
});

test('Diagnostik: Datumswerte verwenden den lokalen Kalendertag', () => {
  assert.match(coreUtils, /formatLocalDateKey\(now\)/);
  assert.doesNotMatch(coreUtils, /toISOString\(\)\.split\('T'\)\[0\]/);
});

test('Diagnostik: Ergebnis- und Screening-Speichern dedupliziert IDs', () => {
  assert.match(container, /currentList\.filter\(result => result\.id !== newResult\.id\)/);
  assert.match(container, /const incomingIds = new Set\(newResults\.map\(result => result\.id\)\)/);
  assert.match(container, /!incomingIds\.has\(result\.id\)/);
});

test('Diagnostik: automatische Texte bleiben pädagogische Momentaufnahmen statt Diagnosen', () => {
  for (const forbidden of [
    'altersgemäß voll ausgeprägt',
    'altersgemäß flüssig',
    'altersgemäß automatisiert',
    'unauffällig und sicher',
    'Visuelle Differenzierung altersgemäß gesichert',
    'Graphomotorische Fähigkeiten altersgemäß gesichert',
    'dringend empfohlen zur differenzierten Förderplanung',
  ]) {
    assert.ok(!evaluation.includes(forbidden) && !coreUtils.includes(forbidden), `Überzogene Formulierung gefunden: ${forbidden}`);
  }

  assert.match(evaluation, /in diesem Check sicher gelöst/);
  assert.match(evaluation, /im Unterricht weiter beobachten/);
});

test('Diagnostik-Archiv: KI-Auslese wird nicht als fehlerfrei behauptet', () => {
  assert.doesNotMatch(legacy, /KI liest alle Tabelleneinträge fehlerfrei aus/);
  assert.match(legacy, /Auslesevorschlag, den du vor dem Speichern vollständig prüfen musst/);
  assert.match(legacy, /Normwerte dürfen nur aus der jeweiligen Originalauswertung übernommen werden/);
  assert.match(legacy, />1\. Prüfhinweise</);
});
