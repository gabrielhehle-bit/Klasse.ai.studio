import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractSpeechResults } from '../hooks/useInlineDictation';
import { noteCategoryAppearance } from './noteCategoryAppearance';

const notes = readFileSync('src/components/Behavior.tsx', 'utf8');
const hook = readFileSync('src/hooks/useInlineDictation.ts', 'utf8');

const speechEvent = (values: { text: string; final: boolean }[], resultIndex = 0) => ({
  resultIndex,
  results: values.map(value => Object.assign([{ transcript: value.text }], { isFinal: value.final })),
});

test('Diktieren: Zwischenergebnis wird angezeigt, endgültige Wörter nur einmal übernommen', () => {
  const alreadySaved = new Set<number>();
  const partial = extractSpeechResults(speechEvent([{ text: 'Das Kind hat', final: false }]), alreadySaved);
  assert.equal(partial.interimText, 'Das Kind hat');
  assert.equal(partial.finalText, '');
  const final = extractSpeechResults(speechEvent([{ text: 'Das Kind hat geholfen', final: true }]), alreadySaved);
  assert.equal(final.finalText, 'Das Kind hat geholfen');
  assert.equal(final.interimText, '');
  const repeated = extractSpeechResults(speechEvent([{ text: 'Das Kind hat geholfen', final: true }]), alreadySaved);
  assert.equal(repeated.finalText, '');
  const later = extractSpeechResults(speechEvent([
    { text: 'Das Kind hat geholfen', final: true },
    { text: 'Sehr gut', final: true },
  ], 1), alreadySaved);
  assert.equal(later.finalText, 'Sehr gut');
});

test('Notizen: Diktieren arbeitet in der vorhandenen Eingabemaske und speichert keinen zweiten Sprach-Eintrag', () => {
  assert.match(notes, /useInlineDictation\(appendDictation\)/);
  assert.match(notes, /setNewEntryText\(previous => \[previous\.trim\(\), text\.trim\(\)\]/);
  assert.match(notes, /onClick=\{\(\) => dictation\.status === 'recording' \? dictation\.stop\(\) : void dictation\.start\(\)\}/);
  assert.match(notes, /disabled=\{!newEntryText\.trim\(\) \|\| dictation\.status !== 'idle'\}/);
  assert.match(notes, /logObservation\(/);
  assert.doesNotMatch(notes, /stimmNotizModal: selectedStudentId \|\| true/);
  assert.match(hook, /recognition\.stop\(\)/);
  assert.match(hook, /onresult = event =>/);
  assert.match(hook, /setStatus\('stopping'\)/);
});

test('Diktieren: lokal bevorzugt, alternative Browser-Spracherkennung nur nach Einwilligung', () => {
  assert.match(hook, /processLocally: true/);
  assert.match(hook, /\['de-AT', 'de-DE'\]/);
  assert.match(hook, /window\.confirm\('Lokale Spracherkennung/);
  assert.match(hook, /Mikrofonzugriff blockiert/);
  assert.match(hook, /Kein Mikrofon erkannt/);
  assert.match(hook, /nicht verfügbar/);
});

test('Notizen: Lob grün, Verhalten gelb, Elternkontakte violett, Journal blau – ohne gespeicherte Kategorieänderung', () => {
  assert.match(noteCategoryAppearance('Erfolg').card, /emerald/);
  assert.match(noteCategoryAppearance('Verhalten').card, /amber/);
  assert.match(noteCategoryAppearance('Eltern').card, /violet/);
  assert.match(noteCategoryAppearance('Journal').card, /sky/);
  assert.match(notes, /appearance\.badge/);
  assert.match(notes, /appearance\.card/);
  assert.match(notes, /noteCategoryAppearance\(noteCategory\)\.field/);
});

test('Notizen: überflüssige Reiter verschwinden, Klasse und Schülerzuordnung bleiben', () => {
  assert.match(notes, /Notizen & Beobachtungen/);
  assert.doesNotMatch(notes, /id: 'config', label: 'Einstellungen'/);
  assert.doesNotMatch(notes, /id: 'verhalten', label: 'Beobachtungsstatus'/);
  assert.doesNotMatch(notes, /id: 'voice', label: 'Diktieren'/);
  assert.match(notes, /selectedStudentId \|\| undefined/);
  assert.match(notes, /filterChronicleEntries\(app\.notes \|\| \[\], chronikFilter, chronikSearch, app\.schueler \|\| \[\]\)/);
  assert.match(notes, /Kategorie filtern/);
  assert.match(notes, /Zeitraum filtern/);
});
