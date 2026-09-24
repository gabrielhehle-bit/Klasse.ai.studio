import { AppState, Student } from '../types';
import { getTodayName } from './utils';
import { getCalmMoodSummary, AggregatedMoodStats } from './moodTypes';

export type KidAttendanceStatus = 'open' | 'present' | 'absent';

export interface KidAttendanceStudentItem {
  id: string;
  originalStudent: Student;
  displayName: string;
  status: KidAttendanceStatus;
  isLockedAbsent: boolean; // Pre-existing absence recorded in central attendance
  delayMinutes?: number;
}

export interface KidAttendanceSummary {
  total: number;
  present: number;
  open: number;
  absent: number;
  isComplete: boolean;
}

/**
 * Liefert das aktuelle Tagesdatum im Format YYYY-MM-DD
 */
export function getTodayIsoDate(overrideDate?: Date): string {
  const d = overrideDate || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ermittelt die aktiven Unterrichtsstunden für ein gegebenes Datum aus app.tageplan
 */
export function getActiveHoursForDate(appState?: AppState | null, dateStr: string = getTodayIsoDate()): string[] {
  if (!appState) return ['1', '2', '3', '4', '5', '6'];

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = getTodayName(dateObj);

  if (dayName && appState.tageplan?.[dayName]?.stunden?.length) {
    return appState.tageplan[dayName].stunden.map(String);
  }

  return ['1', '2', '3', '4', '5', '6'];
}

/**
 * Ermittelt den aktuellen Status eines Schülers für ein bestimmtes Datum:
 * - 'absent': Schüler ist vorab abwesend gemeldet ('e'/'u' oder student.abwesend)
 * - 'present': Schüler hat mindestens ein 'a' und keine 'e'/'u'
 * - 'open': Schüler hat für diesen Tag noch keinen Anwesenheitseintrag
 */
export function getStudentAttendanceStatus(
  studentId: string,
  appState?: AppState | null,
  dateStr: string = getTodayIsoDate()
): { status: KidAttendanceStatus; isPreExistingAbsent: boolean; delayMinutes: number } {
  if (!appState) {
    return { status: 'open', isPreExistingAbsent: false, delayMinutes: 0 };
  }

  const student = appState.schueler?.find((s) => s.id === studentId);
  const isStudentExplicitAbsent = !!((student as any)?.abwesend || (student as any)?.status === 'abwesend');

  const dayAttendance = appState.anwesenheit?.[studentId]?.[dateStr];
  const delayMinutes = appState.anwesenheitDetail?.[studentId]?.[dateStr]?.verspaetung || 0;

  if (isStudentExplicitAbsent) {
    return { status: 'absent', isPreExistingAbsent: true, delayMinutes };
  }

  if (!dayAttendance || typeof dayAttendance !== 'object' || Object.keys(dayAttendance).length === 0) {
    return { status: 'open', isPreExistingAbsent: false, delayMinutes };
  }

  const values = Object.values(dayAttendance);
  const hasAbsence = values.some((v) => v === 'e' || v === 'u');
  if (hasAbsence) {
    return { status: 'absent', isPreExistingAbsent: true, delayMinutes };
  }

  if (values.includes('a')) {
    return { status: 'present', isPreExistingAbsent: false, delayMinutes };
  }

  return { status: 'open', isPreExistingAbsent: false, delayMinutes };
}

/** Teacher-only explanation of the stored day attendance code.
 * The pupil-facing status stays simply "absent" (never expose the reason
 * on the projected check-in cards). Existing per-hour "u" takes precedence
 * over "e" if a day contains both codes. No mutation or migration needed. */
export function getStudentAbsenceCode(
  studentId: string,
  appState?: AppState | null,
  dateStr: string = getTodayIsoDate(),
): 'e' | 'u' | null {
  const entries = appState?.anwesenheit?.[studentId]?.[dateStr];
  if (!entries || typeof entries !== 'object') return null;
  const values = Object.values(entries);
  if (values.includes('u')) return 'u';
  if (values.includes('e')) return 'e';
  return null;
}

/**
 * Schüler-Check-In Aktion (Tippen auf Karte im Schülermodus):
 * - Darf NUR 'open' auf 'present' umstellen.
 * - Fehlbedienungsschutz: Wenn bereits 'present', KEIN Zurückschalten (kein Toggle!).
 * - Konfliktschutz: Wenn bereits 'absent', KEIN Überschreiben.
 */
export function checkInStudent(
  appState: AppState,
  studentId: string,
  dateStr: string = getTodayIsoDate(),
  activeHours?: string[]
): { updatedAppState: AppState; changed: boolean; reason?: string } {
  const current = getStudentAttendanceStatus(studentId, appState, dateStr);

  if (current.status === 'absent') {
    return {
      updatedAppState: appState,
      changed: false,
      reason: 'Bereits als abwesend erfasst. Änderung nur durch Lehrkraft.'
    };
  }

  if (current.status === 'present') {
    // Schutz vor versehentlichem / böswilligem Zurückschalten
    return {
      updatedAppState: appState,
      changed: false,
      reason: 'Bereits eingecheckt.'
    };
  }

  // Setze 'a' für die Stunden des heutigen Tages
  const hours = activeHours || getActiveHoursForDate(appState, dateStr);
  const prevAnwesenheit = appState.anwesenheit || {};
  const studentAttendance = prevAnwesenheit[studentId] || {};
  const newDayAttendance: Record<string, string> = {
    ...(studentAttendance[dateStr] || {})
  };

  hours.forEach((h) => {
    newDayAttendance[h] = 'a';
  });

  const updatedAppState: AppState = {
    ...appState,
    anwesenheit: {
      ...prevAnwesenheit,
      [studentId]: {
        ...studentAttendance,
        [dateStr]: newDayAttendance
      }
    }
  };

  return { updatedAppState, changed: true };
}

/**
 * Lehrkraft setzt Schüler auf 'present' ('da')
 */
export function teacherSetStudentPresent(
  appState: AppState,
  studentId: string,
  dateStr: string = getTodayIsoDate(),
  activeHours?: string[]
): AppState {
  const hours = activeHours || getActiveHoursForDate(appState, dateStr);
  const prevAnwesenheit = appState.anwesenheit || {};
  const studentAttendance = prevAnwesenheit[studentId] || {};
  const newDayAttendance: Record<string, string> = {};

  hours.forEach((h) => {
    newDayAttendance[h] = 'a';
  });

  return {
    ...appState,
    anwesenheit: {
      ...prevAnwesenheit,
      [studentId]: {
        ...studentAttendance,
        [dateStr]: newDayAttendance
      }
    }
  };
}

/**
 * Lehrkraft setzt Schüler auf 'absent' ('abwesend') mit 'u' (unentschuldigt) oder 'e' (entschuldigt)
 */
export function teacherSetStudentAbsent(
  appState: AppState,
  studentId: string,
  dateStr: string = getTodayIsoDate(),
  activeHours?: string[],
  absenceCode: 'u' | 'e' = 'u'
): AppState {
  const hours = activeHours || getActiveHoursForDate(appState, dateStr);
  const prevAnwesenheit = appState.anwesenheit || {};
  const studentAttendance = prevAnwesenheit[studentId] || {};
  const newDayAttendance: Record<string, string> = {};

  hours.forEach((h) => {
    newDayAttendance[h] = absenceCode;
  });

  return {
    ...appState,
    anwesenheit: {
      ...prevAnwesenheit,
      [studentId]: {
        ...studentAttendance,
        [dateStr]: newDayAttendance
      }
    }
  };
}

/**
 * Lehrkraft setzt Schüler zurück auf 'open' (Check-In rückgängig machen)
 */
export function teacherResetStudentToOpen(
  appState: AppState,
  studentId: string,
  dateStr: string = getTodayIsoDate()
): AppState {
  const prevAnwesenheit = appState.anwesenheit || {};
  const studentAttendance = { ...(prevAnwesenheit[studentId] || {}) };
  delete studentAttendance[dateStr];

  // Optional vorhandene Verspätung für heute zurücksetzen
  let updatedDetail = appState.anwesenheitDetail;
  if (updatedDetail?.[studentId]?.[dateStr]) {
    const studentDetail = { ...(updatedDetail[studentId] || {}) };
    delete studentDetail[dateStr];
    updatedDetail = {
      ...updatedDetail,
      [studentId]: studentDetail
    };
  }

  return {
    ...appState,
    anwesenheit: {
      ...prevAnwesenheit,
      [studentId]: studentAttendance
    },
    ...(updatedDetail ? { anwesenheitDetail: updatedDetail } : {})
  };
}

/**
 * Lehrkraft trägt eine Verspätung in Minuten ein
 */
export function teacherSetStudentDelay(
  appState: AppState,
  studentId: string,
  dateStr: string = getTodayIsoDate(),
  delayMinutes: number
): AppState {
  // Wenn der Schüler noch 'open' war, ihn auch als 'a' markieren
  let baseState = appState;
  const currentStatus = getStudentAttendanceStatus(studentId, appState, dateStr);
  if (currentStatus.status === 'open') {
    baseState = teacherSetStudentPresent(baseState, studentId, dateStr);
  }

  const prevDetail = baseState.anwesenheitDetail || {};
  const studentDetail = prevDetail[studentId] || {};
  const dayDetail = studentDetail[dateStr] || {};

  return {
    ...baseState,
    anwesenheitDetail: {
      ...prevDetail,
      [studentId]: {
        ...studentDetail,
        [dateStr]: {
          ...dayDetail,
          verspaetung: Math.max(0, delayMinutes)
        }
      }
    }
  };
}

/**
 * Berechnet Zusammenfassung der Anwesenheit für einen Tag
 */
export function computeKidAttendanceSummary(
  students: Student[],
  appState?: AppState | null,
  dateStr: string = getTodayIsoDate()
): KidAttendanceSummary {
  let present = 0;
  let open = 0;
  let absent = 0;

  for (const s of students) {
    const res = getStudentAttendanceStatus(s.id, appState, dateStr);
    if (res.status === 'present') {
      present++;
    } else if (res.status === 'absent') {
      absent++;
    } else {
      open++;
    }
  }

  const total = students.length;
  const isComplete = total > 0 && open === 0;

  return {
    total,
    present,
    open,
    absent,
    isComplete
  };
}

export interface KidAttendanceMoodSummary {
  totalStudents: number;
  presentStudents: number;
  presentCount: number;
  absentStudents: number;
  absentCount: number;
  openStudents: number;
  openCount: number;
  answeredCount: number; // anwesend + Befinden angegeben
  skippedCount: number;  // anwesend + keine Angabe (übersprungen)
  unansweredCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  distributionPct: Record<1 | 2 | 3 | 4 | 5, number>;
  average: number | null;
  calmSummary: string;
  stats: AggregatedMoodStats;
  details: {
    studentId: string;
    displayName: string;
    moodValue?: number;
  }[];
}

/**
 * Liest den Befindenswert (1..5) eines Schülers für ein bestimmtes Datum aus app.schuelerStimmung
 */
export function getStudentMood(
  studentId: string,
  appState?: AppState | null,
  dateStr: string = getTodayIsoDate()
): number | undefined {
  const val = appState?.schuelerStimmung?.[studentId]?.[dateStr];
  if (typeof val === 'number' && val >= 1 && val <= 5) {
    return val;
  }
  return undefined;
}

/**
 * Kind erfasst freiwillig sein heutiges Befinden (1 = sehr gut bis 5 = schlecht).
 * - Verändert NICHT den Anwesenheitsstatus (vollständig getrennte Datenstrukturen).
 * - Gespeichert in app.schuelerStimmung[studentId][dateStr].
 */
export function recordStudentMood(
  appState: AppState,
  studentId: string,
  moodValue: number,
  dateStr: string = getTodayIsoDate()
): AppState {
  if (moodValue < 1 || moodValue > 5) return appState;

  const prevMoods = appState.schuelerStimmung || {};
  const studentMoods = { ...(prevMoods[studentId] || {}) };
  studentMoods[dateStr] = Math.round(moodValue);

  return {
    ...appState,
    schuelerStimmung: {
      ...prevMoods,
      [studentId]: studentMoods,
    },
  };
}

/**
 * Lehrkraft setzt oder korrigiert den Befindenswert eines Schülers (oder null für "Keine Angabe").
 */
export function teacherSetStudentMood(
  appState: AppState,
  studentId: string,
  moodValue: number | null,
  dateStr: string = getTodayIsoDate()
): AppState {
  const prevMoods = appState.schuelerStimmung || {};
  const studentMoods = { ...(prevMoods[studentId] || {}) };

  if (moodValue === null || moodValue < 1 || moodValue > 5) {
    delete studentMoods[dateStr];
  } else {
    studentMoods[dateStr] = Math.round(moodValue);
  }

  return {
    ...appState,
    schuelerStimmung: {
      ...prevMoods,
      [studentId]: studentMoods,
    },
  };
}

/**
 * Lehrkraft setzt den heutigen Befindenswert auf "Keine Angabe" zurück.
 */
export function teacherClearStudentMood(
  appState: AppState,
  studentId: string,
  dateStr: string = getTodayIsoDate()
): AppState {
  return teacherSetStudentMood(appState, studentId, null, dateStr);
}

/**
 * Berechnet aggregierte Stimmungsdaten für das Wirgefühl:
 * - Nur anwesende Schüler werden berücksichtigt!
 * - Abwesende Kinder werden NIE als neutral oder negativ gezählt.
 * - Fehlende Angaben (Übersprungen) werden separat erfasst.
 */
export function computeKidAttendanceMoodSummary(
  students: Student[],
  appState?: AppState | null,
  dateStr: string = getTodayIsoDate()
): KidAttendanceMoodSummary {
  let presentStudents = 0;
  let absentStudents = 0;
  let openStudents = 0;
  let answeredCount = 0;
  let skippedCount = 0;

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let sum = 0;

  for (const s of students) {
    const res = getStudentAttendanceStatus(s.id, appState, dateStr);
    if (res.status === 'present') {
      presentStudents++;
      const mood = getStudentMood(s.id, appState, dateStr);
      if (typeof mood === 'number' && mood >= 1 && mood <= 5) {
        answeredCount++;
        const key = mood as 1 | 2 | 3 | 4 | 5;
        distribution[key] = (distribution[key] || 0) + 1;
        sum += mood;
      } else {
        skippedCount++;
      }
    } else if (res.status === 'absent') {
      absentStudents++;
    } else {
      openStudents++;
    }
  }

  const distributionPct: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: answeredCount > 0 ? Math.round((distribution[1] / answeredCount) * 100) : 0,
    2: answeredCount > 0 ? Math.round((distribution[2] / answeredCount) * 100) : 0,
    3: answeredCount > 0 ? Math.round((distribution[3] / answeredCount) * 100) : 0,
    4: answeredCount > 0 ? Math.round((distribution[4] / answeredCount) * 100) : 0,
    5: answeredCount > 0 ? Math.round((distribution[5] / answeredCount) * 100) : 0,
  };

  const average = answeredCount > 0 ? Math.round((sum / answeredCount) * 10) / 10 : null;
  const calmSummary = getCalmMoodSummary(average);

  const details = students.map((s) => ({
    studentId: s.id,
    displayName: (s.vorname + (s.nachname ? ' ' + s.nachname[0] + '.' : '')).trim(),
    moodValue: getStudentMood(s.id, appState, dateStr),
  }));

  const stats: AggregatedMoodStats = {
    totalCount: answeredCount,
    average,
    distribution,
    distributionPct,
  };

  return {
    totalStudents: students.length,
    presentStudents,
    presentCount: presentStudents,
    absentStudents,
    absentCount: absentStudents,
    openStudents,
    openCount: openStudents,
    answeredCount,
    skippedCount,
    unansweredCount: skippedCount,
    distribution,
    distributionPct,
    average,
    calmSummary,
    stats,
    details,
  };
}
