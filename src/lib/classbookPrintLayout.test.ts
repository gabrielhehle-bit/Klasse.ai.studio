import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildKlassenbuchPrintRows, formatKlassenbuchPrintEntry } from './classbookPrintLayout';
import { klassenbuchCategoryKey } from './klassenbuchSubjects';
import { buildKlassenbuchDocumentXml, createKlassenbuchDocxBytes } from './klassenbuchDocx';
import JSZip from 'jszip';

const lessons: Record<string, string[]> = {
  [klassenbuchCategoryKey('Deutsch', 'Sprechen & Hören')]:
    ['Montag, 1. Stunde · Unterricht: Ferien erzählen · Material: Buch S. 4 · Reflexion: Hat geklappt'],
  [klassenbuchCategoryKey('Deutsch', 'Lesen')]: ['Eigener Eintrag: Vorleserunde & Gedichte'],
  [klassenbuchCategoryKey('Mathematik', 'Zahlen & Daten')]: ['Dienstag, 2. Stunde · Unterricht: Zahlenraum 1000'],
  [klassenbuchCategoryKey('Mathematik', 'Operationen')]: [],
  Sachunterricht: ['Mittwoch, 3. Stunde · Unterricht: Fahrradcheck'],
  Musikerziehung: [],
};

test('Schulvorlage: separates Fach- und Unterbereichsraster wie im Word-Beispiel', () => {
  const original = JSON.stringify(lessons);
  const rows = buildKlassenbuchPrintRows(lessons, { showEmptyRows: true, detail: 'kurz' });
  assert.deepEqual(rows.map(row => [row.kind, row.label]), [
    ['heading', 'Deutsch'], ['content', 'Sprechen & Hören'], ['content', 'Lesen'],
    ['heading', 'Mathematik'], ['content', 'Zahlen & Daten'], ['content', 'Operationen'],
    ['content', 'Sachunterricht'], ['content', 'Musikerziehung'],
  ]);
  assert.deepEqual(rows[1].lines, ['Unterricht: Ferien erzählen · Material: Buch S. 4']);
  assert.deepEqual(rows[2].lines, ['Eigener Eintrag: Vorleserunde & Gedichte']);
  assert.deepEqual(rows[5].lines, []);
  assert.equal(JSON.stringify(lessons), original, 'Druckoption darf Unterrichtseinträge nicht verändern');
});

test('Leere Unterbereiche lassen sich ausblenden; manuelle Einträge werden nicht gekürzt', () => {
  const rows = buildKlassenbuchPrintRows(lessons, { showEmptyRows: false });
  assert.ok(!rows.some(row => row.label === 'Operationen' || row.label === 'Musikerziehung'));
  assert.ok(rows.some(row => row.label === 'Deutsch' && row.kind === 'heading'));
  assert.equal(formatKlassenbuchPrintEntry('Eigener Eintrag: Meine Notiz · Plan', 'kurz'),
    'Eigener Eintrag: Meine Notiz · Plan');
  assert.equal(formatKlassenbuchPrintEntry('Freitext ohne Label', 'kurz'), 'Freitext ohne Label');
  assert.equal(formatKlassenbuchPrintEntry('Zeit: 8 Uhr · Unterricht: Lesen · Hausübung: S. 2', 'kurz'),
    'Unterricht: Lesen · Hausübung: S. 2');
});

test('Word-Export: echtes editierbares 2-Spalten-Tabellenblatt mit Wochenkopf und Fachbereichen', async () => {
  const options = {
    title: 'Klassenbuch',
    sections: [{ title: 'KW 38 · 14.9.2026 – 18.9.2026', categories: lessons }],
    layout: 'fachbereiche' as const,
    showEmptyRows: true,
    detail: 'kurz' as const,
  };
  const xml = buildKlassenbuchDocumentXml(options);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:tblHeader\/>/);
  assert.match(xml, /Fach \/ Bereich/);
  assert.match(xml, /Deutsch/);
  assert.match(xml, /Sprechen &amp; Hören/);
  assert.match(xml, /Vorleserunde &amp; Gedichte/);
  assert.doesNotMatch(xml, /Hat geklappt/);
  const bytes = await createKlassenbuchDocxBytes(options);
  const zip = await JSZip.loadAsync(bytes);
  assert.match(await zip.file('word/document.xml')!.async('string'), /<w:tblGrid>/);
});

test('Druckzentrum: Vorschau, Papier, PDF und Word wählen dasselbe Layout', () => {
  const printing = readFileSync('src/components/PrintCenter.tsx', 'utf8');
  const pdf = readFileSync('src/lib/klassenbuchPdf.ts', 'utf8');
  assert.match(printing, /Darstellung für deine Schule/);
  assert.match(printing, /Fachbereiche · Wochenblatt wie im Beispiel/);
  assert.match(printing, /buildKlassenbuchPrintRows\(Object\.fromEntries\(printableCategories\)/);
  assert.match(printing, /layout: kbLayout/g);
  assert.match(printing, /showEmptyRows: kbShowEmptyRows/g);
  assert.match(pdf, /buildKlassenbuchPrintRows\(week\.categories/);
});
