import type { AppState, Student } from '../types';
import { LERNZIELE_BY_STUFE } from '../components/LernzielTracker';
import { getAssessmentMode } from './GradeUtils';

export interface SimpleGoal {
  id: string;
  text: string;
  area: string;
}
export interface SimpleArea {
  name: string;
  goals: SimpleGoal[];
}

const SUBJECT_AREAS: Record<string, readonly [string, string, string, string]> = {
  Deutsch: ['Hören/Sprechen', 'Lesen', 'Schreiben', 'Sprachbetrachtung'],
  Mathematik: ['Zahlen & Operieren', 'Größen', 'Geometrie', 'Sachrechnen'],
  Sachunterricht: ['Gemeinschaft', 'Natur', 'Zeit & Gesundheit', 'Technik & Umwelt'],
  Englisch: ['Hören', 'Sprechen', 'Lesen', 'Schreiben & Wortschatz'],
  Musik: ['Singen', 'Hören', 'Bewegen', 'Instrumente & Gestalten'],
  'Bewegung & Sport': ['Motorik', 'Koordination', 'Spielen', 'Geräte & Leichtathletik'],
};

function mapArea(subject: string, prefix: string, names: readonly string[]): string {
  if (names.includes(prefix)) return prefix;
  if (subject === 'Deutsch') {
    if (/grammatik|rechtschreib|sprachbetracht|wortschatz/i.test(prefix)) return names[3];
    if (/hör|sprech|laut|silbe/i.test(prefix)) return names[0];
    if (/les/i.test(prefix)) return names[1];
    if (/schreib/i.test(prefix)) return names[2];
  }
  if (subject === 'Mathematik') {
    if (/zahl|operier|rechn|bruch/i.test(prefix)) return names[0];
    if (/größ|zeit/i.test(prefix)) return names[1];
    if (/geom|raum/i.test(prefix)) return names[2];
    return names[3];
  }
  if (subject === 'Sachunterricht') {
    if (/gemeinsch|politik|verkehr/i.test(prefix)) return names[0];
    if (/natur|umwelt/i.test(prefix)) return names[1];
    if (/zeit|geschicht|gesund|wirtschaft/i.test(prefix)) return names[2];
    return names[3];
  }
  if (subject === 'Englisch') {
    if (/hör/i.test(prefix)) return names[0];
    if (/sprech/i.test(prefix)) return names[1];
    if (/les/i.test(prefix)) return names[2];
    return names[3];
  }
  if (subject === 'Musik') {
    if (/sing/i.test(prefix)) return names[0];
    if (/hör/i.test(prefix)) return names[1];
    if (/beweg|rhythm/i.test(prefix)) return names[2];
    return names[3];
  }
  if (subject === 'Bewegung & Sport') {
    if (/motor/i.test(prefix)) return names[0];
    if (/koord/i.test(prefix)) return names[1];
    if (/spiel/i.test(prefix)) return names[2];
    return names[3];
  }
  return names[3];
}

/** Always exactly four visual areas; preserves every catalogue/manual goal ID. */
export function getSimpleSubjectAreas(subject: string, level: number, student?: Student): SimpleArea[] {
  const catalog = LERNZIELE_BY_STUFE[level] || LERNZIELE_BY_STUFE[1];
  const standard = catalog[subject] || [];
  const manual = (student?.manuelleLernziele || []).filter(goal => goal.stufe === level && goal.fach === subject);
  const rawAreas = Array.from(new Set([
    ...standard.map(goal => goal.text.split(':')[0].trim()).filter(Boolean),
    ...manual.map(goal => goal.kompetenzbereich.trim()).filter(Boolean),
  ]));
  const preset = SUBJECT_AREAS[subject];
  const names: readonly string[] = preset || [
    rawAreas[0] || 'Grundlagen', rawAreas[1] || 'Üben',
    rawAreas[2] || 'Anwenden', rawAreas[3] || 'Weitere Lernziele',
  ];
  const buckets: SimpleArea[] = names.map(name => ({ name, goals: [] }));
  const ids = new Set<string>();
  const insert = (id: string, text: string, prefix: string) => {
    if (ids.has(id)) return;
    ids.add(id);
    const resolved = mapArea(subject, prefix, names);
    const area = buckets.find(item => item.name === resolved) || buckets[3];
    area.goals.push({ id, text, area: area.name });
  };
  for (const goal of standard) {
    const separator = goal.text.indexOf(':');
    insert(goal.id, separator >= 0 ? goal.text.slice(separator + 1).trim() : goal.text,
      separator >= 0 ? goal.text.slice(0, separator).trim() : names[3]);
  }
  for (const goal of manual) insert(goal.id, goal.text, goal.kompetenzbereich);
  return buckets;
}

/** One school-year view: period 1 holds current data; legacy root fills missing keys only.
 * Period 2 is retained in storage without being silently overwritten. */
export function getSimpleAnnualGoalRatings(app: AppState, studentId: string): Record<string, number | null> {
  return {
    ...(app.studentLernzielBewertungen?.[studentId] || {}),
    ...(app.studentLernzielSemesterBewertungen?.[studentId]?.['1'] || {}),
  };
}

export interface SimpleGrade {
  label: string;
  value: string;
  group: number;
}

/** Only genuine 1–5 grades may enter a grade chart; percentages/points stay untouched. */
export function getSimpleSubjectGrades(app: AppState, studentId: string, subject: string): SimpleGrade[] {
  if (getAssessmentMode(app, subject) !== 'grades') return [];
  const period = app.noten?.[studentId]?.[subject] || {};
  const first = period['1'];
  const old = period['2'];
  const current = first && (['sa', 'lzk', 'wp', 'aufgaben'] as const)
    .some(key => (first[key] || []).some(value => value !== null && value !== undefined && value !== ''))
    ? first : old || first;
  if (!current) return [];
  const result: SimpleGrade[] = [];
  for (const [key, label] of [
    ['sa', 'Schularbeit'], ['lzk', 'Lernzielkontrolle'],
    ['wp', 'Wochenplan'], ['aufgaben', 'Sonstige Leistung'],
  ] as const) {
    (current[key] || []).forEach((value, index) => {
      const raw = String(value ?? '').trim();
      if (!/^[1-5][+-]?$/.test(raw)) return;
      result.push({ label: `${label} ${index + 1}`, value: raw, group: Number(raw[0]) });
    });
  }
  return result;
}
