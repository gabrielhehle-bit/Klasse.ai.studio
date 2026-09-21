import { berechne } from './GradeUtils';
import type { AppState } from '../types';
import { faecherFuerKlasse } from './sek1Subjects';

export type Sek1GradeEntry = {
  fach: string;
  /** A saved manual grade is reported as entered, never as a calculated mark. */
  wert: string;
  quelle: 'direkt_eingetragen' | 'rechnerisch';
};

export type Sek1GradebookComment = {
  fach: string;
  semester: '1' | '2';
  text: string;
};

/** Display of teacher-entered secondary grade values, not a Zeugnisnoten calculator. */
export function sek1GradeEntries(app: AppState, studentId: string, semester: '1' | '2'): Sek1GradeEntry[] {
  return faecherFuerKlasse(app).flatMap(fach => {
    const data = app.noten?.[studentId]?.[fach]?.[semester];
    const explicit = String(data?.endnote ?? '').trim();
    if (explicit) return [{fach, wert: explicit, quelle: 'direkt_eingetragen' as const}];
    const calculated = berechne(app, studentId, fach, semester);
    return calculated === null ? [] : [{fach, wert: calculated.toFixed(2), quelle: 'rechnerisch' as const}];
  });
}

/** Notenmappe comments remain in their original class-local subject/semester records. */
export function sek1GradebookComments(app: AppState, studentId: string): Sek1GradebookComment[] {
  return faecherFuerKlasse(app).flatMap(fach =>
    (['1', '2'] as const).flatMap(semester => {
      const text = String(app.noten?.[studentId]?.[fach]?.[semester]?.freitext || '').trim();
      return text ? [{ fach, semester, text }] : [];
    })
  );
}
