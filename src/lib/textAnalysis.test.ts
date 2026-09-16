import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeGermanText,
  buildTextAnalysisHints,
  countGermanSyllables,
  getGermanFleschLabel,
  getWstfLabel,
} from './textAnalysis';

test('Textanalyse: deutsche Silbenzählung ist deterministisch und behandelt qu als Einheit', () => {
  assert.equal(countGermanSyllables('Haus'), 1);
  assert.equal(countGermanSyllables('Schule'), 2);
  assert.equal(countGermanSyllables('Banane'), 3);
  assert.equal(countGermanSyllables('Quelle'), 2);
});

test('Textanalyse: berechnet Amstad-Flesch und Wiener Sachtextformel aus realen Textmerkmalen', () => {
  const result = analyzeGermanText('Die Katze sitzt auf der Bank. Sie schaut in den Garten.');
  assert.ok(result);
  assert.equal(result?.sentences, 2);
  assert.equal(result?.words, 11);
  assert.ok(Number.isFinite(result!.fleschGerman));
  assert.ok(Number.isFinite(result!.wienerSachtextformel1));
  assert.ok(result!.averageSentenceLength > 0);
  assert.ok(result!.averageSyllablesPerWord > 0);
});

test('Textanalyse: leerer Text erzeugt keine erfundene Bewertung', () => {
  assert.equal(analyzeGermanText('   '), null);
});

test('Textanalyse: WSTF kennzeichnet Werte unter Stufe 4 ausdrücklich als außerhalb der Skala', () => {
  assert.match(getWstfLabel(3.2), /unterhalb der WSTF-Schulstufenskala/);
  assert.match(getWstfLabel(6.5), /Schwierigkeitsstufe 6.5/);
});

test('Textanalyse: Hilfen bleiben formale Hinweise und keine automatische Eignungsentscheidung', () => {
  const analysis = analyzeGermanText(
    'Diese außergewöhnlich umfangreiche Unterrichtsdokumentation enthält mehrsilbige Fachterminologie und kombiniert mehrere Gedankengänge innerhalb eines einzelnen ausgesprochen langen Satzes, sodass die formale Verarbeitung für ungeübte Leserinnen und Leser anspruchsvoller werden kann.'
  )!;
  const hints = buildTextAnalysisHints(analysis);
  assert.ok(hints.length > 0);
  assert.ok(hints.some(hint => /Sätze|Wörter|Flesch/.test(hint)));
  assert.equal(typeof getGermanFleschLabel(analysis.fleschGerman), 'string');
});
