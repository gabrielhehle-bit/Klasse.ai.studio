import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAutomaticParticipationSubject } from './cockpitParticipationSubject';
import { readFileSync } from 'node:fs';

test('Cockpit: Punkte fließen nur zu einem tatsächlich eingestellten Unterrichtsfach', () => {
  const subjects = ['Deutsch', 'Mathematik', 'Sachunterricht'];
  assert.equal(resolveAutomaticParticipationSubject('Deutsch', subjects, 'auto'), 'Deutsch');
  assert.equal(resolveAutomaticParticipationSubject('Mathematik', subjects, undefined), 'Mathematik');
  assert.equal(resolveAutomaticParticipationSubject('Unterricht', subjects, 'auto'), null);
  assert.equal(resolveAutomaticParticipationSubject('Religion/DAZ', subjects, 'auto'), null);
  assert.equal(resolveAutomaticParticipationSubject('   ', subjects, 'auto'), null);
});

test('Die explizite Fachwahl wird auch in einer planmäßigen Unterrichtsstunde respektiert', () => {
  assert.equal(resolveAutomaticParticipationSubject('Deutsch', ['Deutsch'], 'choose'), null);
  assert.equal(resolveAutomaticParticipationSubject('Unterricht', [], 'auto'), null);
  assert.equal(resolveAutomaticParticipationSubject('Deutsch', undefined, 'auto'), null);
});

test('Die bestehende Oberfläche bietet die Fachauswahl vor der Punktebuchung an', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(cockpit, /if \(!automaticSubject\) \{\s*setPendingParticipation/);
  assert.match(cockpit, /if \(classId !== app.activeClassId/);
  assert.match(cockpit, /!app.faecher\?\.includes\(subject\)/);
  assert.match(cockpit, /awardParticipation\(sid, automaticSubject, app.activeClassId, event, onAwarded\)/);
});
