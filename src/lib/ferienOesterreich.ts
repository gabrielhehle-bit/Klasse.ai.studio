import { VOBSHoliday, getEaster } from './vobsHolidays';

export type Bundesland = 'W' | 'NOE' | 'BGL' | 'KTN' | 'OOE' | 'SBG' | 'STMK' | 'T' | 'VBG';

export const BUNDESLAND_NAMEN: Record<Bundesland, string> = {
  W: 'Wien',
  NOE: 'Niederösterreich',
  BGL: 'Burgenland',
  KTN: 'Kärnten',
  OOE: 'Oberösterreich',
  SBG: 'Salzburg',
  STMK: 'Steiermark',
  T: 'Tirol',
  VBG: 'Vorarlberg'
};

const warnedSchuljahre = new Set<string>();

/**
 * Returns holidays for the given bundesland and school year.
 * Hint: school autonomy days and short-term changes are not included.
 * Please add school autonomy days manually in settings or the year planner.
 * "Ohne Gewähr – schulautonome Tage bitte selbst im Jahresplan ergänzen."
 */
function getStartYear(schuljahr: string): number {
  if (!schuljahr) return new Date().getFullYear();
  const m = schuljahr.match(/(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return new Date().getFullYear();
}

/**
 * Returns holidays for the given bundesland and school year.
 * Hint: school autonomy days and short-term changes are not included.
 * Please add school autonomy days manually in settings or the year planner.
 * "Ohne Gewähr – schulautonome Tage bitte selbst im Jahresplan ergänzen."
 */
export function getFerien(bundesland: Bundesland = 'VBG', schuljahr: string = '2025/26'): VOBSHoliday[] {
  // Safe fallback if bundesland is unknown/invalid
  if (!BUNDESLAND_NAMEN[bundesland]) {
    bundesland = 'VBG';
  }

  const supportedYears = ['2025/26', '2026/27', '2027/28', '2028/29', '2029/30'];
  if (!supportedYears.includes(schuljahr)) {
    if (!warnedSchuljahre.has(schuljahr)) {
      warnedSchuljahre.add(schuljahr);
      console.warn(`Keine Ferientermine für das Schuljahr ${schuljahr} hinterlegt.`);
    }
    return [];
  }

  const startYear = getStartYear(schuljahr);

  const list: VOBSHoliday[] = [
    // Statutory Holidays (Static)
    { id: 'neujahr', name: 'Neujahr', month: 0, day: 1, type: 'static' },
    { id: 'dreikoenige', name: 'Hl. Drei Könige', month: 0, day: 6, type: 'static' },
    { id: 'staatsfeiertag', name: 'Staatsfeiertag', month: 4, day: 1, type: 'static' },
    { id: 'himmelfahrt_mariae', name: 'Mariä Himmelfahrt', month: 7, day: 15, type: 'static' },
    { id: 'nationalfeiertag', name: 'Nationalfeiertag', month: 9, day: 26, type: 'static' },
    { id: 'allerheiligen', name: 'Allerheiligen', month: 10, day: 1, type: 'static' },
    { id: 'allerseelen', name: 'Allerseelen (schulfrei)', month: 10, day: 2, type: 'static' },
    { id: 'empaengnis', name: 'Mariä Empfängnis', month: 11, day: 8, type: 'static' },
    { id: 'weihnachten', name: 'Weihnachten', month: 11, day: 25, type: 'static' },
    { id: 'stefanitag', name: 'Stefanitag', month: 11, day: 26, type: 'static' },

    // Landespatrone based on State
    ...(bundesland === 'VBG' || bundesland === 'T' || bundesland === 'KTN' || bundesland === 'STMK'
      ? [{ id: 'josef', name: 'Landespatron (Hl. Josef)', month: 2, day: 19, type: 'static' as const }]
      : []),
    ...(bundesland === 'W' || bundesland === 'NOE'
      ? [{ id: 'leopold', name: 'Landespatron (Hl. Leopold)', month: 10, day: 15, type: 'static' as const }]
      : []),
    ...(bundesland === 'SBG'
      ? [{ id: 'rupert', name: 'Landespatron (Hl. Rupert)', month: 8, day: 24, type: 'static' as const }]
      : []),
    ...(bundesland === 'OOE'
      ? [{ id: 'florian', name: 'Landespatron (Hl. Florian)', month: 4, day: 4, type: 'static' as const }]
      : []),
    ...(bundesland === 'BGL'
      ? [{ id: 'martin', name: 'Landespatron (Hl. Martin)', month: 10, day: 11, type: 'static' as const }]
      : []),

    // Easter Based
    { id: 'ostermontag', name: 'Ostermontag', offset: 1, type: 'easter' },
    { id: 'christi_himmelfahrt', name: 'Christi Himmelfahrt', offset: 39, type: 'easter' },
    { id: 'pfingstmontag', name: 'Pfingstmontag', offset: 50, type: 'easter' },
    { id: 'fronleichnam', name: 'Fronleichnam', offset: 60, type: 'easter' },
    { id: 'faschingsdienstag', name: 'Faschingsdienstag', offset: -47, type: 'easter' }
  ];

  // 1. Herbstferien
  const herbstStartDay = (schuljahr === '2025/26' && bundesland !== 'VBG') ? 27 : 26;
  const herbstEndDay = (schuljahr === '2025/26') ? 31 : 2;
  const herbstEndMonth = (schuljahr === '2025/26') ? 9 : 10;
  list.push({
    id: `herbst_${startYear}`,
    name: `Herbstferien ${startYear}`,
    year: startYear,
    startMonth: 9,
    startDay: herbstStartDay,
    endMonth: herbstEndMonth,
    endDay: herbstEndDay,
    type: 'range'
  });

  // 2. Weihnachtsferien
  list.push({
    id: `weihnachten_${startYear}`,
    name: `Weihnachtsferien ${startYear}`,
    year: startYear,
    startMonth: 11,
    startDay: 24,
    endMonth: 11,
    endDay: 31,
    type: 'range'
  });
  list.push({
    id: `weihnachten_${startYear + 1}_start`,
    name: `Weihnachtsferien ${startYear + 1}`,
    year: startYear + 1,
    startMonth: 0,
    startDay: 1,
    endMonth: 0,
    endDay: 6,
    type: 'range'
  });

  // 3. Semesterferien
  const firstOfFeb = new Date(startYear + 1, 1, 1);
  let firstMonday = 1;
  const dayOfWeek = firstOfFeb.getDay();
  if (dayOfWeek !== 1) {
    firstMonday = 1 + (8 - dayOfWeek) % 7;
  }
  let semStartDay = firstMonday;
  if (bundesland === 'W' || bundesland === 'NOE') {
    semStartDay = firstMonday;
  } else if (bundesland === 'OOE' || bundesland === 'STMK') {
    semStartDay = firstMonday + 14;
  } else {
    semStartDay = firstMonday + 7;
  }
  const semStart = new Date(startYear + 1, 1, semStartDay);
  const semEnd = new Date(startYear + 1, 1, semStartDay + 5);
  list.push({
    id: `semester_${startYear + 1}`,
    name: `Semesterferien ${startYear + 1}`,
    year: startYear + 1,
    startMonth: 1,
    startDay: semStart.getDate(),
    endMonth: 1,
    endDay: semEnd.getDate(),
    type: 'range'
  });

  // 4. Osterferien
  const easterDate = getEaster(startYear + 1);
  const osternStart = new Date(easterDate);
  osternStart.setDate(easterDate.getDate() - 8);
  const osternEnd = new Date(easterDate);
  osternEnd.setDate(easterDate.getDate() + 1);
  list.push({
    id: `ostern_${startYear + 1}`,
    name: `Osterferien ${startYear + 1}`,
    year: startYear + 1,
    startMonth: osternStart.getMonth(),
    startDay: osternStart.getDate(),
    endMonth: osternEnd.getMonth(),
    endDay: osternEnd.getDate(),
    type: 'range'
  });

  // 5. Pfingstferien
  const pfingstenStart = new Date(easterDate);
  const pfingstenEnd = new Date(easterDate);
  if (bundesland === 'VBG') {
    pfingstenStart.setDate(easterDate.getDate() + 50);
    pfingstenEnd.setDate(easterDate.getDate() + 51);
  } else {
    pfingstenStart.setDate(easterDate.getDate() + 48);
    pfingstenEnd.setDate(easterDate.getDate() + 50);
  }
  list.push({
    id: `pfingsten_${startYear + 1}`,
    name: `Pfingstferien ${startYear + 1}`,
    year: startYear + 1,
    startMonth: pfingstenStart.getMonth(),
    startDay: pfingstenStart.getDate(),
    endMonth: pfingstenEnd.getMonth(),
    endDay: pfingstenEnd.getDate(),
    type: 'range'
  });

  // 6. Sommerferien
  const firstOfJuly = new Date(startYear + 1, 6, 1);
  const dayOfWeekJuly = firstOfJuly.getDay();
  const firstSaturday = 1 + (6 - dayOfWeekJuly + 7) % 7;
  const secondSaturday = firstSaturday + 7;
  const somStartDay = (bundesland === 'W' || bundesland === 'NOE' || bundesland === 'BGL') ? firstSaturday : secondSaturday;
  const somStart = new Date(startYear + 1, 6, somStartDay);
  const somEnd = new Date(startYear + 1, 6, somStartDay + 64);
  list.push({
    id: `sommer_${startYear + 1}`,
    name: `Sommerferien ${startYear + 1}`,
    year: startYear + 1,
    startMonth: somStart.getMonth(),
    startDay: somStart.getDate(),
    endMonth: somEnd.getMonth(),
    endDay: somEnd.getDate(),
    type: 'range'
  });

  return list;
}

export function checkHoliday(
  date: Date,
  disabledHolidays: string[] = [],
  bundesland: Bundesland = 'VBG'
): VOBSHoliday | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Combine holidays across our supported school years so any date check finds its holidays
  const holidays = [
    ...getFerien(bundesland, '2025/26'),
    ...getFerien(bundesland, '2026/27'),
    ...getFerien(bundesland, '2027/28'),
    ...getFerien(bundesland, '2028/29'),
    ...getFerien(bundesland, '2029/30')
  ];

  // De-duplicate holidays by id
  const uniqueHolidays: VOBSHoliday[] = [];
  const seenIds = new Set<string>();
  for (const h of holidays) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id);
      uniqueHolidays.push(h);
    }
  }

  for (const h of uniqueHolidays) {
    if (disabledHolidays.includes(h.id)) continue;

    if (h.type === 'static') {
      if (h.month === month && h.day === day) {
        if (h.year && h.year !== year) continue;
        return h;
      }
    } else if (h.type === 'easter') {
      const easter = getEaster(year);
      const target = new Date(easter);
      target.setDate(easter.getDate() + (h.offset || 0));
      if (target.getFullYear() === year && target.getMonth() === month && target.getDate() === day) {
        return h;
      }
    } else if (h.type === 'range') {
      if (h.year && h.year !== year) {
        if (h.id.includes('sommer') || h.id.includes('weihnachten')) {
          // allow check pass
        } else {
          continue;
        }
      }
      
      const start = new Date(h.year || year, h.startMonth!, h.startDay!);
      const end = new Date(h.year || year, h.endMonth!, h.endDay!);
      const t = new Date(year, month, day).getTime();
      if (t >= start.getTime() && t <= end.getTime()) {
        return h;
      }
    }
  }

  return null;
}
