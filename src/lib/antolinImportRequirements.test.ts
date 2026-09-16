import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const statistics = readFileSync('src/components/Statistics.tsx', 'utf8');
const modal = readFileSync('src/components/AntolinImportModal.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');

test('Antolin: Import ist direkt in Statistik & Profile sichtbar', () => {
  assert.match(statistics, /Antolin importieren/);
  assert.match(statistics, /setShowAntolinImport\(true\)/);
  assert.match(statistics, /<AntolinImportModal/);
  assert.match(statistics, /PDF, CSV oder Text importieren/);
});

test('Antolin: Upload akzeptiert PDF sowie Text-/Tabellenformate', () => {
  assert.match(modal, /accept="\.pdf,\.csv,\.txt,\.tsv,application\/pdf,text\/csv,text\/plain"/);
  assert.match(modal, /Antolin-Tabelle hier einfügen/);
  assert.match(modal, /maximal 20 MB/);
});

test('Antolin: Analyse nutzt bestehende geschützte Serverroute und zeigt Vorschau vor dem Speichern', () => {
  assert.match(modal, /fetch\('\/api\/ai\/analyze-antolin'/);
  assert.match(modal, /credentials: 'same-origin'/);
  assert.match(modal, /Bitte kurz prüfen und anschließend übernehmen/);
  assert.match(server, /app\.post\("\/api\/ai\/analyze-antolin"/);
  assert.match(server, /app\.use\('\/api\/ai', requireAccess\)/);
});

test('Antolin: Import wird als klassenlokaler Snapshot mit Quelle import gespeichert', () => {
  assert.match(modal, /classId: app\.activeClassId/);
  assert.match(modal, /quelle: 'import'/);
  assert.match(modal, /antolinRecords: \[\.\.\.\(prev\.antolinRecords \|\| \[\]\), \.\.\.imported\]/);
});

test('Antolin: KI-Übertragung erfordert ausdrückliche Bestätigung', () => {
  assert.match(modal, /privacyConfirmed/);
  assert.match(modal, /zur automatischen Auswertung an den in Klassio konfigurierten KI-Dienst übertragen/);
  assert.match(modal, /Bitte bestätige zuerst die KI-Analyse des Antolin-Berichts/);
});
