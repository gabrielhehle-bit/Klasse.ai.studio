import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const printCenter = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const klassenbuchPdf = readFileSync('src/lib/klassenbuchPdf.ts', 'utf8');
const klassenbuchSubjects = readFileSync('src/lib/klassenbuchSubjects.ts', 'utf8');

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
  assert.match(klassenbuchPdf, /pageOrientation: 'portrait'/);
  assert.match(klassenbuchPdf, /unbreakable: fitsOnePage/);
  assert.match(klassenbuchPdf, /dontBreakRows: fitsOnePage/);
  assert.match(klassenbuchPdf, /const longestEntry =/);
  assert.match(klassenbuchPdf, /Fach \/ Unterbereich/);
  assert.match(klassenbuchPdf, /Dokumentierter Unterricht \/ Inhalt/);
  assert.match(klassenbuchPdf, /Abwesenheiten \/ Fehlstunden/);
  assert.match(klassenbuchPdf, /Seite \$\{currentPage\} von \$\{pageCount\}/);
});

test('Klassenbuch: Druckzentrum und Wochenplan verwenden die gleiche kanonische Zuordnung einschließlich halbierter Stunden', () => {
  const projection = readFileSync('src/lib/weeklyClassbookProjection.ts', 'utf8');
  assert.match(printCenter, /projectWeeklyPlanToClassbook\(/);
  assert.match(weekly, /projectWeeklyPlanToClassbook\(/);
  assert.match(projection, /getKlassenbuchBaseCategories/);
  assert.match(projection, /classifyKlassenbuchEntry/);
  assert.match(projection, /orderKlassenbuchCategoryKeys/);
  assert.match(projection, /lesson\.halves\?\.enabled/);
  assert.match(projection, /'1\. Hälfte'/);
  assert.match(projection, /'2\. Hälfte'/);
  assert.match(projection, /zeitunabhaengig/);
  for (const label of ['DEUTSCH_UNTERFAECHER','MATHEMATIK_UNTERFAECHER','Sprachbetrachtung','Sprechen & Hören',
    'Lesen','Rechtschreibung','Verfassen von Texten','Förderung','Ebene & Raum','Zahlen & Daten',
    'Größen','Operationen']) {
    assert.ok(klassenbuchSubjects.includes(label), `Klassenbuch-Struktur fehlt: ${label}`);
  }
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


test('Klassenbuch: Browserdruck ist eine feste A4-Hochformatseite pro Woche', () => {
  assert.match(printCenter, /activeTemplate === 'klassenbuch' \? 'A4 portrait'/);
  assert.match(printCenter, /\.klassenbuch-a4-page \{/);
  assert.match(printCenter, /width: 210mm !important/);
  assert.match(printCenter, /height: 297mm !important/);
  assert.match(printCenter, /padding: 8\.5mm !important/);
  assert.match(printCenter, /page-break-inside: avoid !important/);
  assert.match(printCenter, /setPrintOrientation\('portrait'\)/);
  assert.match(printCenter, /setPrintMargin\(8\.5\)/);
});
