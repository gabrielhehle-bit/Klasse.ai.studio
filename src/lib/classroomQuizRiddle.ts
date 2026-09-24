/** Validate AI output before placing a quiz or riddle on the public smartboard.
 * No student answers or names need to be sent to the AI service. */
export interface ClassroomQuizQuestion {
  t: string; q: string; o: [string, string, string, string]; a: 0 | 1 | 2 | 3;
}
export interface ClassroomRiddle { q: string; a: string; emoji: string }
export function validClassroomQuiz(raw: unknown): ClassroomQuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.q !== 'string' || !v.q.trim() || v.q.length > 500 ||
      !Array.isArray(v.o) || v.o.length !== 4 ||
      !v.o.every(o => typeof o === 'string' && o.trim().length > 0 && o.length <= 170) ||
      !Number.isInteger(v.a) || (v.a as number) < 0 || (v.a as number) > 3) return null;
  const values = v.o as [string, string, string, string];
  if (new Set(values.map(x => x.trim().toLocaleLowerCase('de-AT'))).size !== 4) return null;
  return { t: typeof v.t === 'string' ? v.t.slice(0, 35) : 'Wissen',
    q: v.q.trim(), o: values.map(x => x.trim()) as ClassroomQuizQuestion['o'],
    a: v.a as ClassroomQuizQuestion['a'] };
}
export function validClassroomRiddle(raw: unknown): ClassroomRiddle | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.q !== 'string' || !v.q.trim() || v.q.length > 550 ||
      typeof v.a !== 'string' || !v.a.trim() || v.a.length > 220) return null;
  return { q: v.q.trim(), a: v.a.trim(),
    emoji: typeof v.emoji === 'string' ? v.emoji.slice(0, 45) : '🤔' };
}
