import type { AppState } from '../types';
import { berechne } from './GradeUtils';

export type OverviewSemester = '1' | '2' | 'combined';
export type OverviewNote = { noteToRender: string | number | null; numericForAvg: number | null };

/** Use the existing grade calculation and manual endnote precedence, without changing either.
 * The class overview and its CSV export must display the same value.
 */
export function getOverviewNote(app: AppState, studentId: string, fach: string, semester: OverviewSemester): OverviewNote {
  const hasNotenmappe = app.fachConfig?.[fach]?.unterrichtet !== false;
  const getNoteInfo = (semIdx: '1' | '2'): number | string | null => {
    const ndSem: any = app.noten?.[studentId]?.[fach]?.[semIdx];
    if (ndSem?.endnote) {
      const num = parseFloat(ndSem.endnote.toString().replace(',', '.'));
      return !Number.isNaN(num) ? num : ndSem.endnote;
    }
    if (hasNotenmappe) {
      const calculated = berechne(app, studentId, fach, semIdx);
      return calculated !== null ? Math.round(calculated) : null;
    }
    return null;
  };

  if (semester !== 'combined') {
    const noteToRender = getNoteInfo(semester);
    return { noteToRender, numericForAvg: typeof noteToRender === 'number' ? noteToRender : null };
  }

  const note1 = getNoteInfo('1');
  const note2 = getNoteInfo('2');
  if (note1 !== null && note2 !== null) {
    if (typeof note1 === 'number' && typeof note2 === 'number') {
      const numericForAvg = (note1 + note2) / 2;
      return { noteToRender: Math.round(numericForAvg), numericForAvg };
    }
    return { noteToRender: `${note1} / ${note2}`, numericForAvg: null };
  }
  const noteToRender = note1 !== null ? note1 : note2;
  return { noteToRender, numericForAvg: typeof noteToRender === 'number' ? noteToRender : null };
}
