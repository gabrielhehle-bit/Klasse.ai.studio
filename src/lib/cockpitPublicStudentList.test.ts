import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');
const teaching = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('öffentliche Schülerliste zeigt keine privaten Dossier-/Verhaltensangaben', () => {
  assert.match(teaching, /PublicStudentListWidget as StudentListWidgetContent/);
  assert.match(source, /getDisplayStudentName\(student, students\)/);
  for (const hiddenField of ['behavior_status', 'behavior_comments', 'studentNotes', 'diagnostik', 'geburtstag', 'schuelerStimmung', 'getBehaviorSymbol']) {
    assert.doesNotMatch(source, new RegExp('(?:app\\.|student\\.|prev\\.|\\{)\\s*' + hiddenField));
  }
  assert.doesNotMatch(source, /student\.nachname/);
  assert.doesNotMatch(source, /aria-label=.{0,80}(?:Minuspunkt|negatives Verhalten|Notiz vorhanden)/);
});

test('öffentliche Schülerliste korrigiert nur ein in dieser Ansicht bewusst vergebenes Plus', () => {
  assert.match(source, /lastAwardedId === student\.id/);
  assert.match(source, /if \(getTodayPoints\(student\.id\) > 0\) removeParticipation\(student\.id\)/);
  assert.match(source, /min-h-11 min-w-11/);
  assert.match(source, /app\.activeClassId/);
});
