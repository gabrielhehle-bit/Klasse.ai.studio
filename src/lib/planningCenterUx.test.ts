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
