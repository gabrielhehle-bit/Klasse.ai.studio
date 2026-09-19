import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'components', 'PlanungsZentrale.tsx'), 'utf8');

test('Planungszentrale verwendet den gemeinsamen 10-Stunden-Vertrag', () => {
  assert.match(source, /LESSON_SLOT_NUMBERS/);
  assert.match(source, /MAX_LESSON_SLOTS/);
  assert.match(source, /Wochenplan-Gitter \(5×10\)/);
  assert.doesNotMatch(source, /\[0, 1, 2, 3, 4, 5\]/);
  assert.doesNotMatch(source, /hIdx < 6/);
  assert.doesNotMatch(source, /5x6/);
});

test('Planungszentrale erfindet keine Fächer für eine leere Klasse', () => {
  assert.match(source, /Array\.isArray\(app\.faecher\) \? app\.faecher\.filter\(Boolean\) : \[\]/);
  assert.match(source, /defaultFach \|\| availableSubjects\[0\] \|\| ''/);
  assert.doesNotMatch(source, /'Mathematik', 'Deutsch', 'Sachunterricht'/);
  assert.doesNotMatch(source, /availableSubjects\[0\] \|\| 'Mathematik'/);
  assert.match(source, /Für diese Klasse sind noch keine Fächer eingerichtet/);
});

test('Öffnen der Planungszentrale verändert am Wochenende nicht still die globale Kalenderwoche', () => {
  assert.doesNotMatch(source, /hasBumped/);
  assert.doesNotMatch(source, /Auto-advance calendar week during weekend/);
  assert.match(source, /const nextKW = app\.currentKW \|\| actualKW/);
});

test('Planungszentrale benennt ihre beiden Ebenen verständlich', () => {
  assert.match(source, /'Übersicht'/);
  assert.match(source, /'Planungswerkzeuge'/);
  assert.doesNotMatch(source, /Einfachmodus AN/);
  assert.equal((source.match(/grid grid-cols-2 bg-slate-100/g) || []).length >= 1, true);
});


test('Planungszentrale zeigt echte KI-Vorschläge und erfindet bei Fehlern keine Ersatzantwort', () => {
  assert.match(source, /aiSuggestions\.length > 0/);
  assert.match(source, /aiSuggestions\.slice\(0, 3\)\.map/);
  assert.match(source, /KI-Vorschläge konnten nicht geladen werden/);
  assert.match(source, /Der KI-Wocheneinblick konnte nicht geladen werden/);
  assert.doesNotMatch(source, /Stationenbetrieb & Forscherauftrag/);
  assert.doesNotMatch(source, /Volksschulklasse 3/);
  assert.doesNotMatch(source, /Schulstufe \$\{app\.stufe \|\| 3\}/);
});

test('Wochen-Check verwendet die aktive Klasse statt einer erfundenen 3a', () => {
  assert.match(source, /app\.classes\?\.find\(c => c\.id === app\.activeClassId\)/);
  assert.match(source, /app\.klassenbezeichnung/);
  assert.match(source, /Keine Klasse ausgewählt/);
  assert.doesNotMatch(source, /app\.klasse \|\| 'Klasse 3a'/);
  assert.doesNotMatch(source, /'Klasse 3a'/);
});

test('Wochen-Check nennt die gewählte Woche und bezeichnet Wochenend-Montag nicht als heute', () => {
  assert.match(source, /monday\.toLocaleDateString\('de-DE'\)/);
  assert.match(source, /weekEnd\.toLocaleDateString\('de-DE'\)/);
  assert.doesNotMatch(source, /Was ist heute geplant\?/);
  assert.doesNotMatch(source, /Morgen stehen 6 Stunden an/);
  assert.doesNotMatch(source, /Schulwoche \{sw \|\| '1'\}/);
});

test('Wochen-Check plant nicht doppelt und wertet offene Stundenplanfelder nicht als unvorbereitete Stunden', () => {
  assert.match(source, /missingTopicLessons = openLessonsList\.filter\(item => item\.thema === 'Kein Thema eingetragen'\)/);
  assert.match(source, /onClick=\{\(\) => setPage\('wochenplanung'\)\}/);
  assert.match(source, /Leere Stundenplanfelder werden hier nicht automatisch als offene Vorbereitung gewertet/);
  assert.doesNotMatch(source, /Offene Vorbereitungen/);
  assert.doesNotMatch(source, /Alles perfekt vorbereitet!/);
});
