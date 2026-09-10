import { AppState, Student } from '../../types';

export interface CockpitStudent {
  id: string;
  name?: string;
  vorname?: string;
  nachname?: string;
  geschlecht?: string;
  abwesend?: boolean;
  status?: string;
  [key: string]: any;
}

/**
 * Standard-Fallbackliste für den Demo-/Vorschaumodus ohne importierte Schülerdaten
 */
export const DEFAULT_MOCK_STUDENTS: CockpitStudent[] = [
  { id: 'mock-1', name: 'Max M.', vorname: 'Max', nachname: 'Müller', geschlecht: 'm' },
  { id: 'mock-2', name: 'Anna S.', vorname: 'Anna', nachname: 'Schmid', geschlecht: 'w' },
  { id: 'mock-3', name: 'Lukas B.', vorname: 'Lukas', nachname: 'Bauer', geschlecht: 'm' },
  { id: 'mock-4', name: 'Emma F.', vorname: 'Emma', nachname: 'Fischer', geschlecht: 'w' },
  { id: 'mock-5', name: 'Ben W.', vorname: 'Ben', nachname: 'Weber', geschlecht: 'm' },
  { id: 'mock-6', name: 'Mia L.', vorname: 'Mia', nachname: 'Lehner', geschlecht: 'w' },
  { id: 'mock-7', name: 'Jonas K.', vorname: 'Jonas', nachname: 'Kraus', geschlecht: 'm' },
  { id: 'mock-8', name: 'Laura H.', vorname: 'Laura', nachname: 'Hofer', geschlecht: 'w' },
  { id: 'mock-9', name: 'Felix E.', vorname: 'Felix', nachname: 'Eder', geschlecht: 'm' },
  { id: 'mock-10', name: 'Sophie G.', vorname: 'Sophie', nachname: 'Gruber', geschlecht: 'w' },
  { id: 'mock-11', name: 'David M.', vorname: 'David', nachname: 'Maier', geschlecht: 'm' },
  { id: 'mock-12', name: 'Elena K.', vorname: 'Elena', nachname: 'Koller', geschlecht: 'w' },
];

/**
 * Namensdarstellung nach LehrerAPP-Standard:
 * Vorname. Falls mehrere Kinder denselben Vornamen haben: "Vorname N." (mit erstem Buchstaben des Nachnamens).
 */
export function getDisplayStudentName(
  student: { id: string; vorname?: string; name?: string; nachname?: string },
  allStudents: Array<{ id: string; vorname?: string; name?: string; nachname?: string }>
): string {
  const firstName = student.vorname || (student.name ? student.name.split(' ')[0] : 'Schüler');
  const duplicates = allStudents.filter(
    (s) => s.id !== student.id && (s.vorname || (s.name ? s.name.split(' ')[0] : '')) === firstName
  );
  if (duplicates.length > 0) {
    const lastName = student.nachname || (student.name ? student.name.split(' ')[1] : '');
    if (lastName) {
      return `${firstName} ${lastName[0]}.`;
    }
  }
  return firstName;
}

/**
 * Prüft, ob ein Schüler am heutigen Tag als abwesend markiert ist (Status oder Anwesenheitsmatrix).
 */
export function isStudentAbsentToday(studentId: string, appState?: AppState | null): boolean {
  if (!appState) return false;
  const student = appState.schueler?.find((s: any) => s.id === studentId) as any;
  if (student?.abwesend || student?.status === 'abwesend') return true;

  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceForStudent = appState.anwesenheit?.[studentId]?.[todayStr];
  if (attendanceForStudent && typeof attendanceForStudent === 'object') {
    const values = Object.values(attendanceForStudent);
    if (values.some((v) => v === 'e' || v === 'u')) {
      return true;
    }
  }
  return false;
}

/**
 * Fisher-Yates Shuffle für saubere, unvoreingenommene Rundenreihenfolge
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Ermittelt alle anwesenden Schüler einer Klasse bzw. das Fallback-Array.
 */
export function getPresentStudents(
  appStudents: Student[] | undefined,
  appState?: AppState | null
): CockpitStudent[] {
  const list = appStudents && appStudents.length > 0 ? appStudents : DEFAULT_MOCK_STUDENTS;
  return list.filter((s) => !isStudentAbsentToday(s.id, appState));
}
