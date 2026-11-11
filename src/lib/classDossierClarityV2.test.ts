import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/ClassDossier.tsx', 'utf8');

test('Klassendossier 2.0 zeigt Anwesenheit ausschließlich als Quote erfasster Einheiten mit Datenmenge', () => {
  assert.match(dossier, /attendanceRecorded: attendance\.recorded/);
  assert.match(dossier, /attendanceChildren: studentRows\.filter\(row => row\.attendanceRecorded > 0\)\.length/);
  assert.match(dossier, /attendance\.recorded \? \(attendance\.present \/ attendance\.recorded\) \* 100 : null/);
  assert.ok(dossier.includes('sub: `${current.attendanceChildren}/${students.length} Kinder'));
  assert.match(dossier, /Nur erfasste Einheiten zählen/);
  assert.match(dossier, /Nicht dokumentierte Tage oder Stunden gelten weder als anwesend noch als fehlend/);
  assert.match(dossier, /row\.attendance === null \? 'Nicht erfasst'/);
  assert.doesNotMatch(dossier, /recordedForDay/);
  assert.match(dossier, /A note without an attendance status or absence hours is not a recorded unit/);
});

test('Trendhinweise benötigen ausreichende Datenbasis und werten Befindensskalen nicht vorschnell', () => {
  assert.match(dossier, /current\.attendanceChildren >= Math\.ceil\(students\.length \* 0\.75\)/);
  assert.match(dossier, /previous\.attendanceChildren >= Math\.ceil\(students\.length \* 0\.75\)/);
  assert.match(dossier, /current\.moodCount >= 5 && previous\.moodCount >= 5/);
  assert.match(dossier, /current\.behaviorCount >= 5 && previous\.behaviorCount >= 5/);
  assert.match(dossier, /Befinden \$\{delta < 0 \? 'verbessert sich' : 'zeigt mehr Unterstützungsbedarf'\}/);
  assert.match(dossier, /<YAxis reversed domain=\{\[1, 5\]\}/);
  assert.match(dossier, /1 = sehr gut \(oben\), 5 = schlecht \(unten\)/);
});

test('Dünne Verlaufsdaten erzeugen keine suggestive Trendlinie', () => {
  for (const key of ['attendance', 'mood', 'behavior']) {
    assert.match(dossier, new RegExp('data-class-sparse-chart="' + key + '"'));
  }
  for (const key of ['observedAttendance', 'observedMood', 'observedBehavior']) {
    assert.ok(dossier.includes(key + '.length >= 3'));
  }
  assert.match(dossier, /für einen Trend sind mindestens 3 nötig/);
});

test('Kinder im Blick ist such- und filterbar, ohne die vorhandenen Schülerdaten zu verändern', () => {
  assert.match(dossier, /const \[studentSearch, setStudentSearch\] = useState\(''\)/);
  assert.match(dossier, /withoutAttendance/);
  assert.match(dossier, /visibleRows\.map\(row => \(/);
  assert.match(dossier, /onSelectStudent\(row\.id\)/);
  assert.match(dossier, /data-class-structure-details/);
  assert.doesNotMatch(dossier, /setApp\(/);
});
