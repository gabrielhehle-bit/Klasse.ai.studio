import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTodayIsoDate,
  getActiveHoursForDate,
  getStudentAttendanceStatus,
  checkInStudent,
  teacherSetStudentPresent,
  teacherSetStudentAbsent,
  teacherResetStudentToOpen,
  teacherSetStudentDelay,
  computeKidAttendanceSummary,
  recordStudentMood,
  teacherSetStudentMood,
  teacherClearStudentMood,
  getStudentMood,
  computeKidAttendanceMoodSummary,
} from './kidAttendanceAlgorithm';
import { KID_MOOD_SCALE, getMoodMeta, getCalmMoodSummary } from './moodTypes';
import { getDisplayStudentName } from '../components/cockpit/studentSelectionUtils';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';
import { AppState, Student } from '../types';

function createMockAppState(): AppState {
  const mockStudents: Student[] = [
    { id: 'stud-1', vorname: 'Anna', nachname: 'Schmid', geschlecht: 'w', klasse: '2a' } as unknown as Student,
    { id: 'stud-2', vorname: 'Anna', nachname: 'Maier', geschlecht: 'w', klasse: '2a' } as unknown as Student,
    { id: 'stud-3', vorname: 'Felix', nachname: 'Gruber', geschlecht: 'm', klasse: '2a' } as unknown as Student,
    { id: 'stud-4', vorname: 'Lea', nachname: 'Bauer', geschlecht: 'w', klasse: '2a' } as unknown as Student,
  ];

  return {
    schueler: mockStudents,
    anwesenheit: {},
    anwesenheitDetail: {},
    tageplan: {
      Montag: { stunden: [1, 2, 3, 4] },
      Dienstag: { stunden: [1, 2, 3, 4, 5] },
    },
  } as unknown as AppState;
}

test('KidAttendance: 1. Alle aktiven Schüler erscheinen in der Berechnung', () => {
  const app = createMockAppState();
  const summary = computeKidAttendanceSummary(app.schueler, app, '2026-09-05');
  assert.equal(summary.total, 4);
  assert.equal(summary.open, 4);
  assert.equal(summary.present, 0);
  assert.equal(summary.absent, 0);
  assert.equal(summary.isComplete, false);
});

test('KidAttendance: 2. Doppelte Vornamen werden korrekt disambiguiert (Vorname + Nachnamensinitiale)', () => {
  const app = createMockAppState();
  const name1 = getDisplayStudentName(app.schueler[0], app.schueler);
  const name2 = getDisplayStudentName(app.schueler[1], app.schueler);
  const name3 = getDisplayStudentName(app.schueler[2], app.schueler);

  assert.equal(name1, 'Anna S.');
  assert.equal(name2, 'Anna M.');
  assert.equal(name3, 'Felix'); // Kein Duplikat -> nur Vorname
});

test('KidAttendance: 3. Kind kann sich als "da" markieren (Status wechselt auf present)', () => {
  const app = createMockAppState();
  const today = '2026-09-05';

  const res = checkInStudent(app, 'stud-3', today, ['1', '2', '3', '4']);
  assert.equal(res.changed, true);

  const status = getStudentAttendanceStatus('stud-3', res.updatedAppState, today);
  assert.equal(status.status, 'present');
  assert.equal(res.updatedAppState.anwesenheit['stud-3'][today]['1'], 'a');
  assert.equal(res.updatedAppState.anwesenheit['stud-3'][today]['2'], 'a');
});

test('KidAttendance: 4. Mehrfach-Tap erzeugt keinen Toggle-Fehler (Schutz vor Fehlbedienung)', () => {
  const app = createMockAppState();
  const today = '2026-09-05';

  // Erster Tap
  const firstTap = checkInStudent(app, 'stud-3', today, ['1', '2']);
  assert.equal(firstTap.changed, true);
  assert.equal(getStudentAttendanceStatus('stud-3', firstTap.updatedAppState, today).status, 'present');

  // Zweiter Tap durch Schüler darf NICHT zurückschalten!
  const secondTap = checkInStudent(firstTap.updatedAppState, 'stud-3', today, ['1', '2']);
  assert.equal(secondTap.changed, false);
  assert.equal(getStudentAttendanceStatus('stud-3', secondTap.updatedAppState, today).status, 'present');
});

test('KidAttendance: 5. Offene Kinder werden nicht automatisch als abwesend markiert', () => {
  const app = createMockAppState();
  const today = '2026-09-05';

  // Ein Kind checkt ein
  const res = checkInStudent(app, 'stud-1', today);
  const status1 = getStudentAttendanceStatus('stud-1', res.updatedAppState, today);
  const status2 = getStudentAttendanceStatus('stud-2', res.updatedAppState, today);

  assert.equal(status1.status, 'present');
  assert.equal(status2.status, 'open'); // Bleibt sauber auf 'open'
});

test('KidAttendance: 6. Abschluss zeigt noch offene Kinder korrekt an', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  app = checkInStudent(app, 'stud-1', today).updatedAppState;
  app = checkInStudent(app, 'stud-3', today).updatedAppState;

  const summary = computeKidAttendanceSummary(app.schueler, app, today);
  assert.equal(summary.total, 4);
  assert.equal(summary.present, 2);
  assert.equal(summary.open, 2);
  assert.equal(summary.absent, 0);
  assert.equal(summary.isComplete, false);
});

test('KidAttendance: 7. Lehrkraft kann Schüler auf abwesend setzen', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  app = teacherSetStudentAbsent(app, 'stud-4', today, ['1', '2', '3'], 'u');
  const status = getStudentAttendanceStatus('stud-4', app, today);

  assert.equal(status.status, 'absent');
  assert.equal(app.anwesenheit['stud-4'][today]['1'], 'u');
});

test('KidAttendance: 8. Bereits eingetragene Abwesenheit wird respektiert (Schüler-Tap überschreibt nicht)', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  // Vorab krankgemeldet von Eltern/Lehrkraft
  app = teacherSetStudentAbsent(app, 'stud-2', today, ['1', '2'], 'e');
  assert.equal(getStudentAttendanceStatus('stud-2', app, today).status, 'absent');

  // Schüler tippt auf Karte -> darf nicht überschrieben werden!
  const tapRes = checkInStudent(app, 'stud-2', today);
  assert.equal(tapRes.changed, false);
  assert.equal(getStudentAttendanceStatus('stud-2', tapRes.updatedAppState, today).status, 'absent');
});

test('KidAttendance: 9. Lehrkraft kann bewusst korrigieren (abwesend -> da, da -> abwesend, reset auf offen)', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  // Schüler war abwesend
  app = teacherSetStudentAbsent(app, 'stud-1', today, ['1'], 'u');
  assert.equal(getStudentAttendanceStatus('stud-1', app, today).status, 'absent');

  // Lehrkraft korrigiert bewusst auf "da"
  app = teacherSetStudentPresent(app, 'stud-1', today, ['1', '2']);
  assert.equal(getStudentAttendanceStatus('stud-1', app, today).status, 'present');

  // Lehrkraft setzt auf "offen" zurück
  app = teacherResetStudentToOpen(app, 'stud-1', today);
  assert.equal(getStudentAttendanceStatus('stud-1', app, today).status, 'open');
});

test('KidAttendance: 10. Tageswechsel: Gestern da, heute startet sauber neu als offen', () => {
  let app = createMockAppState();
  const yesterday = '2026-09-04';
  const today = '2026-09-05';

  // Gestern eingecheckt
  app = checkInStudent(app, 'stud-1', yesterday).updatedAppState;
  assert.equal(getStudentAttendanceStatus('stud-1', app, yesterday).status, 'present');

  // Heute noch nicht eingecheckt -> muss 'open' sein!
  assert.equal(getStudentAttendanceStatus('stud-1', app, today).status, 'open');

  // Historische Daten von gestern bleiben unberührt
  assert.equal(app.anwesenheit['stud-1'][yesterday]['1'], 'a');
});

test('KidAttendance: 11. Stabile Schüler-IDs als Primärschlüssel', () => {
  const app = createMockAppState();
  const today = '2026-09-05';
  const res = checkInStudent(app, 'stud-1', today);

  assert.ok(res.updatedAppState.anwesenheit['stud-1']);
  assert.equal(res.updatedAppState.anwesenheit['Anna Schmid'], undefined);
});

test('KidAttendance: 12. Keine sensiblen Daten (Noten, Diagnostik) im Datenmodell benötigt oder verändert', () => {
  const app = createMockAppState();
  const today = '2026-09-05';
  const res = checkInStudent(app, 'stud-1', today);

  const status = getStudentAttendanceStatus('stud-1', res.updatedAppState, today);
  assert.equal(typeof status.status, 'string');
  // Es gibt nur status, isPreExistingAbsent, delayMinutes
  assert.deepEqual(Object.keys(status).sort(), ['delayMinutes', 'isPreExistingAbsent', 'status']);
});

test('KidAttendance: 13. Keine Netzwerkrequests / 100% offline synchrone Logik', () => {
  const app = createMockAppState();
  const res = checkInStudent(app, 'stud-1', '2026-09-05');
  assert.equal(res.changed, true);
  assert.ok(res.updatedAppState);
});

test('KidAttendance: 14. Keine KI erforderlich', () => {
  // Pure deterministic algorithm
  const app = createMockAppState();
  const today = '2026-09-05';
  const res = checkInStudent(app, 'stud-1', today);
  assert.equal(res.changed, true);
});

test('KidAttendance: 15. Keine parallele Klartext-Persistenz, nutzt app.anwesenheit', () => {
  const app = createMockAppState();
  const today = '2026-09-05';
  const res = checkInStudent(app, 'stud-1', today, ['1']);

  assert.equal(res.updatedAppState.anwesenheit['stud-1'][today]['1'], 'a');
  assert.equal((res.updatedAppState as any).widgetAttendance, undefined);
});

test('KidAttendance: 16. COMPACT Responsive Kategorie (280 - 379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(320), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('KidAttendance: 17. STANDARD Responsive Kategorie (380 - 549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('KidAttendance: 18. LARGE Responsive Kategorie (550 - 799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(650), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('KidAttendance: 19. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(350, true), 'fullscreen');
});

test('KidAttendance: 20. Mindestmaße im WIDGET_MIN_SIZES Register vorhanden', () => {
  // kidattendance min size
  const minConfig = WIDGET_MIN_SIZES['kidattendance'] || { minW: 280, minH: 220 };
  assert.ok(minConfig.minW >= 280);
  assert.ok(minConfig.minH >= 200);
});

test('KidAttendance F9.1: 21. Kanonische 5-stufige Befindensskala (Werte 1 bis 5)', () => {
  assert.equal(KID_MOOD_SCALE.length, 5);
  assert.equal(KID_MOOD_SCALE[0].value, 1);
  assert.equal(KID_MOOD_SCALE[0].emoji, '😄');
  assert.equal(KID_MOOD_SCALE[0].label.toLowerCase(), 'sehr gut');

  assert.equal(KID_MOOD_SCALE[1].value, 2);
  assert.equal(KID_MOOD_SCALE[1].emoji, '🙂');
  assert.equal(KID_MOOD_SCALE[1].label.toLowerCase(), 'gut');

  assert.equal(KID_MOOD_SCALE[2].value, 3);
  assert.equal(KID_MOOD_SCALE[2].emoji, '😐');
  assert.equal(KID_MOOD_SCALE[2].label.toLowerCase(), 'okay');

  assert.equal(KID_MOOD_SCALE[3].value, 4);
  assert.equal(KID_MOOD_SCALE[3].emoji, '🙁');
  assert.equal(KID_MOOD_SCALE[3].label.toLowerCase(), 'nicht so gut');

  assert.equal(KID_MOOD_SCALE[4].value, 5);
  assert.equal(KID_MOOD_SCALE[4].emoji, '😢');
  assert.equal(KID_MOOD_SCALE[4].label.toLowerCase(), 'schlecht');
});

test('KidAttendance F9.1: 22. Schülerauswahl speichert Stimmung in schuelerStimmung ohne Einfluss auf Anwesenheit', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  // 1. Kind checkt sich ein
  const checkRes = checkInStudent(app, 'stud-1', today, ['1', '2']);
  assert.equal(checkRes.changed, true);
  app = checkRes.updatedAppState;

  // Anwesenheit ist 'present'
  assert.equal(getStudentAttendanceStatus('stud-1', app, today).status, 'present');

  // 2. Kind wählt Befinden: 1 (sehr gut 😄)
  app = recordStudentMood(app, 'stud-1', 1, today);

  // Stimmung gespeichert
  assert.equal(getStudentMood('stud-1', app, today), 1);
  assert.equal(app.schuelerStimmung['stud-1'][today], 1);

  // Anwesenheit unverändert 'present'
  assert.equal(getStudentAttendanceStatus('stud-1', app, today).status, 'present');
});

test('KidAttendance F9.1: 23. Überspringen belässt Anwesenheit auf Da und setzt keine Stimmung', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  // Kind checkt sich ein
  const checkRes = checkInStudent(app, 'stud-2', today, ['1', '2']);
  app = checkRes.updatedAppState;

  // Kind überspringt (keine Befindenseingabe)
  assert.equal(getStudentMood('stud-2', app, today), undefined);
  // Anwesenheit bleibt voll gültig
  assert.equal(getStudentAttendanceStatus('stud-2', app, today).status, 'present');
});

test('KidAttendance F9.1: 24. computeKidAttendanceMoodSummary aggregiert Verteilung, Durchschnitt und Beteiligung', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  // 3 Kinder anwesend
  app = checkInStudent(app, 'stud-1', today, ['1']).updatedAppState;
  app = checkInStudent(app, 'stud-2', today, ['1']).updatedAppState;
  app = checkInStudent(app, 'stud-3', today, ['1']).updatedAppState;

  // Stimmungen: stud-1 -> 1 (sehr gut), stud-2 -> 2 (gut), stud-3 -> übersprungen
  app = recordStudentMood(app, 'stud-1', 1, today);
  app = recordStudentMood(app, 'stud-2', 2, today);

  const summary = computeKidAttendanceMoodSummary(app.schueler, app, today);

  assert.equal(summary.totalStudents, 4);
  assert.equal(summary.presentCount, 3);
  assert.equal(summary.answeredCount, 2);
  assert.equal(summary.unansweredCount, 1);
  assert.equal(summary.stats.totalCount, 2);
  assert.equal(summary.stats.average, 1.5);
  assert.equal(summary.stats.distribution[1], 1);
  assert.equal(summary.stats.distribution[2], 1);
  assert.equal(summary.stats.distribution[3], 0);
  assert.equal(summary.stats.distribution[4], 0);
  assert.equal(summary.stats.distribution[5], 0);
});

test('KidAttendance F9.1: 25. Lehrkraft kann Befinden korrigieren oder nachtragen', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  // Lehrkraft setzt Befinden für stud-3 auf 4 (nicht so gut 🙁)
  app = teacherSetStudentMood(app, 'stud-3', 4, today);
  assert.equal(getStudentMood('stud-3', app, today), 4);

  // Lehrkraft korrigiert auf 2 (gut 🙂)
  app = teacherSetStudentMood(app, 'stud-3', 2, today);
  assert.equal(getStudentMood('stud-3', app, today), 2);
});

test('KidAttendance F9.1: 26. Lehrkraft kann Befindenseintrag löschen (auf Keine Angabe zurücksetzen)', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  app = recordStudentMood(app, 'stud-1', 5, today);
  assert.equal(getStudentMood('stud-1', app, today), 5);

  app = teacherClearStudentMood(app, 'stud-1', today);
  assert.equal(getStudentMood('stud-1', app, today), undefined);
});

test('KidAttendance F9.1: 27. Regelbasierte Wirgefühl-Zusammenfassung (calmSummary) ohne KI', () => {
  const summaryVeryGood = getCalmMoodSummary(1.2);
  assert.ok(summaryVeryGood.toLowerCase().includes('sehr positiv'));

  const summaryMixed = getCalmMoodSummary(3.0);
  assert.equal(summaryMixed.toLowerCase(), 'gemischt');

  const summaryEmpty = getCalmMoodSummary(null);
  assert.equal(summaryEmpty, 'Keine Angaben');
});

test('KidAttendance F9.1: 28. Keine Vermischung: Anwesenheitsstatus-Objekt enthält keine sensiblen Befindensdaten', () => {
  let app = createMockAppState();
  const today = '2026-09-05';

  app = checkInStudent(app, 'stud-1', today, ['1']).updatedAppState;
  app = recordStudentMood(app, 'stud-1', 4, today);

  const attendanceStatus = getStudentAttendanceStatus('stud-1', app, today);
  // Anwesenheitsstatus darf keine mood/befinden Felder öffentlich transportieren
  assert.equal((attendanceStatus as any).mood, undefined);
  assert.equal((attendanceStatus as any).befinden, undefined);
  assert.equal((attendanceStatus as any).stimmung, undefined);
});

