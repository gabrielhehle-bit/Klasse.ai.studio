import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const live = readFileSync('src/components/LiveDiagnostik.tsx', 'utf8');

function extractReadingTexts(source: string): Array<{ grade: number; text: string }> {
  return Array.from(
    source.matchAll(/titel: 'Klasse (\d):[^']*\(100 Wörter\)',\s+text: '([^']+)'/g),
    match => ({ grade: Number(match[1]), text: match[2] }),
  );
}

test('Lesediagnostik: alle Lautlesetexte enthalten exakt 100 Wörter', () => {
  const texts = extractReadingTexts(live);
  assert.deepEqual(texts.map(item => item.grade), [1, 2, 3, 4]);
  for (const item of texts) {
    assert.equal(
      item.text.trim().split(/\s+/).length,
      100,
      `Klasse ${item.grade}: Lesetext muss exakt 100 Wörter enthalten`,
    );
  }
});

test('Lesediagnostik: letztes gelesenes Wort wird explizit statt implizit erfasst', () => {
  assert.match(live, /lastReadWordIndex/);
  assert.match(live, /setMarkingLastWord/);
  assert.match(live, /Letztes Wort/);
  assert.match(live, /Als letztes gelesenes Wort markieren/);
  assert.match(live, /disabled=\{lastReadWordIndex === null\}/);
  assert.doesNotMatch(live, /if \(totalWordsRead === 0\) totalWordsRead = textWords\.length/);
});

test('Lesediagnostik: Fehler, Selbstkorrekturen und Prosodie werden getrennt gespeichert', () => {
  assert.match(live, /errorsCount/);
  assert.match(live, /selfCorrections/);
  assert.match(live, /prosodyRating/);
  assert.match(live, /Intonation \/ Prosodie/);
  assert.match(live, /Abgehackt \/ monoton/);
  assert.match(live, /Sinngestaltend \/ sicher/);
  assert.match(live, /lastReadWord: info\.lastReadWord/);
  assert.match(live, /prosodyRating: info\.prosodyRating/);
});

test('Lesediagnostik: eine Einzelmessung erzeugt keinen automatischen Förderbedarf', () => {
  assert.match(live, /not a stand-alone diagnosis or automatic support decision/);
  assert.match(live, /fbedarf = false/);
  assert.match(live, /Ein einzelner WpM-Wert begründet keine Diagnose/);
});

test('Lesediagnostik: Richtwerte für Klasse 2 und 3 sind ausdrücklich nur Orientierung', () => {
  assert.match(live, /Ende 2\. Klasse: ca\. 80–90 richtig gelesene Wörter\/min als Orientierung – keine amtliche Norm/);
  assert.match(live, /Ende 3\. Klasse: ca\. 110 richtig gelesene Wörter\/min als Studienorientierung – keine amtliche Norm/);
  assert.match(live, /Röttig, Schwerkolt & Nottbusch \(2021\)/);
  assert.match(live, /BiSS-Transfer \/ Bildungsdirektion Steiermark/);
});
