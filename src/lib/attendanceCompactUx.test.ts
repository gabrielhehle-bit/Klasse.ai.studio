import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const attendance = readFileSync('src/components/Attendance.tsx', 'utf8');
const mood = readFileSync('src/components/AttendanceMoodField.tsx', 'utf8');

test('Anwesenheit: eine eindeutige Sammelaktion statt zweier gleicher Speicheraktionen', () => {
  assert.equal(attendance.match(/onClick=\{handleCompleteCheck\}/g)?.length, 1);
  assert.equal(attendance.match(/setAllStudents\("a", true\)/g)?.length, 1);
  assert.match(attendance, /Offene als anwesend bestätigen/);
  assert.doesNotMatch(attendance, /Nur offene anwesend/);
});

test('Anwesenheit: Offen-Filter schaltet nur Anzeige um und lässt Tagesdaten unberührt', () => {
  assert.match(attendance, /const \[showOnlyOpen, setShowOnlyOpen\] = useState\(false\)/);
  assert.match(attendance, /const visibleStudents = showOnlyOpen/);
  assert.match(attendance, /activeHours\.some\(hour => !app\.anwesenheit\[student\.id\]\?\.\[selectedDate\]\?\.\[hour\]\)/);
  assert.equal(attendance.match(/visibleStudents\.map\(\(s, idx\)/g)?.length, 2);
  assert.match(attendance, /setShowOnlyOpen\(false\)/);
  assert.match(attendance, /Keine offenen Anwesenheitseinträge mehr für diesen Tag/);
});

test('Anwesenheit: Befinden, Fehlstunden, Verspätung und Notizen bleiben erhalten', () => {
  assert.match(attendance, /<AttendanceMoodField studentId=\{s\.id\}/);
  assert.match(attendance, /setActiveFehlstundenSid\(s\.id\)/);
  assert.match(attendance, /setActiveDelaySid\(s\.id\)/);
  assert.match(attendance, /setActiveNoteSid\(s\.id\)/);
  assert.match(mood, /teacherSetStudentMood/);
});
