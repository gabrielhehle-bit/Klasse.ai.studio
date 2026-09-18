import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const printCenter = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const klassenbuchPdf = readFileSync('src/lib/klassenbuchPdf.ts', 'utf8');

test('Druckzentrum: jede auswählbare Vorlage besitzt einen Render-Pfad', () => {
  const ids = Array.from(printCenter.matchAll(/\{ id: '([^']+)', icon:/g)).map(match => match[1]);
  const cases = new Set(Array.from(printCenter.matchAll(/case '([^']+)'/g)).map(match => match[1]));

  assert.ok(ids.length >= 15, 'Druckzentrum sollte den vollständigen Vorlagenkatalog enthalten');
  for (const id of ids) {
    assert.ok(cases.has(id), `Kein Render-Pfad für Druckvorlage: ${id}`);
  }
});

test('Druckzentrum: Browserdruck verwendet nur eine Randebene und vermeidet leere Schlussseite', () => {
  assert.match(printCenter, /@page \{[\s\S]*margin: 0;/);
  assert.match(printCenter, /style=\{\{ padding: `\$\{printMargin\}mm` \}\}/);
  assert.match(printCenter, /\.page-break:last-child \{/);
  assert.match(printCenter, /break-after: auto !important/);
});

test('Klassenbuch: direkte PDF-Ausgabe ist mit Woche, Bereich und Gesamt verbunden', () => {
  assert.match(printCenter, /downloadKlassenbuchPdf/);
  assert.match(printCenter, /Klassenbuch als PDF herunterladen/);
  assert.match(printCenter, /getKbWeeksToRender\(\)/);
  assert.match(printCenter, /includeAbsentees: kbIncludeAbsentees/);
  assert.match(printCenter, /includeOccurrences: kbIncludeOccurrences/);
  assert.match(printCenter, /signatures: kbSignatures/);

  assert.match(klassenbuchPdf, /pageSize: 'A4'/);
  assert.match(klassenbuchPdf, /Dokumentierter Unterricht \/ Inhalt/);
  assert.match(klassenbuchPdf, /Abwesenheiten \/ Fehlstunden/);
  assert.match(klassenbuchPdf, /Seite \$\{currentPage\} von \$\{pageCount\}/);
});

test('Klassenbuch: Druckzentrum übernimmt die differenzierten Fachbereiche aus der Wochenplanung', () => {
  for (const label of [
    'Deutsch - Sprechen & Hören',
    'Deutsch - D-FÖ',
    'Mathematik - Ebene & Raum',
    'Mathematik - Zahlen & Daten',
    'Mathematik - Größen',
    'Mathematik - Operationen',
    'Förderung (FÖ)',
  ]) {
    assert.ok(printCenter.includes(label), `Klassenbuch-Bereich fehlt: ${label}`);
  }
  assert.match(printCenter, /item\.halves\?\.enabled/);
  assert.match(printCenter, /1\. Hälfte:/);
  assert.match(printCenter, /2\. Hälfte:/);
});

test('Wochenplanung: obsolete Größen- und Filterleiste ist entfernt', () => {
  assert.doesNotMatch(weekly, /weeklyDensityMode/);
  assert.doesNotMatch(weekly, /densityMode/);
  assert.doesNotMatch(weekly, /Fach-Filter/);
  assert.doesNotMatch(weekly, /subjectFilter/);
  assert.doesNotMatch(weekly, /Nur Offene/);
  assert.doesNotMatch(weekly, /filterOnlyOffen/);
  assert.match(weekly, /Wochenplan<\/span>/);
  assert.match(weekly, /Klassenbuch<\/span>/);
});
