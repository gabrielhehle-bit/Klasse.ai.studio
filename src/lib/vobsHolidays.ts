
export interface VOBSHoliday {
  id: string;
  name: string;
  date?: string; // YYYY-MM-DD for static holidays
  month?: number; // 0-11
  day?: number;
  type: 'static' | 'dynamic' | 'range' | 'easter';
  offset?: number; // days from easter
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
  year?: number;
}

export const VOBS_HOLIDAYS: VOBSHoliday[] = [
  // Statutory Holidays (Static)
  { id: 'neujahr', name: 'Neujahr', month: 0, day: 1, type: 'static' },
  { id: 'dreikoenige', name: 'Hl. Drei Könige', month: 0, day: 6, type: 'static' },
  { id: 'josef', name: 'Landespatron (Hl. Josef)', month: 2, day: 19, type: 'static' },
  { id: 'staatsfeiertag', name: 'Staatsfeiertag', month: 4, day: 1, type: 'static' },
  { id: 'himmelfahrt_mariae', name: 'Mariä Himmelfahrt', month: 7, day: 15, type: 'static' },
  { id: 'nationalfeiertag', name: 'Nationalfeiertag', month: 9, day: 26, type: 'static' },
  { id: 'allerheiligen', name: 'Allerheiligen', month: 10, day: 1, type: 'static' },
  { id: 'empaengnis', name: 'Mariä Empfängnis', month: 11, day: 8, type: 'static' },
  { id: 'weihnachten', name: 'Weihnachten', month: 11, day: 25, type: 'static' },
  { id: 'stefanitag', name: 'Stefanitag', month: 11, day: 26, type: 'static' },

  // Easter Based
  { id: 'ostermontag', name: 'Ostermontag', offset: 1, type: 'easter' },
  { id: 'christi_himmelfahrt', name: 'Christi Himmelfahrt', offset: 39, type: 'easter' },
  { id: 'pfingstmontag', name: 'Pfingstmontag', offset: 50, type: 'easter' },
  { id: 'fronleichnam', name: 'Fronleichnam', offset: 60, type: 'easter' },

  // Ranges 2025/26
  { id: 'herbst_2025', name: 'Herbstferien 2025', year: 2025, startMonth: 9, startDay: 26, endMonth: 9, endDay: 31, type: 'range' },
  { id: 'weihnachten_2025', name: 'Weihnachtsferien 2025', year: 2025, startMonth: 11, startDay: 24, endMonth: 11, endDay: 31, type: 'range' },
  { id: 'weihnachten_2026_start', name: 'Weihnachtsferien 2026', year: 2026, startMonth: 0, startDay: 1, endMonth: 0, endDay: 6, type: 'range' },
  { id: 'semester_2026', name: 'Semesterferien 2026', year: 2026, startMonth: 1, startDay: 9, endMonth: 1, endDay: 14, type: 'range' },
  { id: 'fasching_2026', name: 'Faschingsdienstag 2026', year: 2026, month: 1, day: 17, type: 'static' },
  { id: 'ostern_2026', name: 'Osterferien 2026', year: 2026, startMonth: 2, startDay: 28, endMonth: 3, endDay: 6, type: 'range' },
  // VOBS Pfingsten 2026: Official Pfingsten is Mon 25.05. Standard holiday might include Tue. 
  // User says Friday 22.05 is school day. So we define range as Mon-Tue (25-26).
  { id: 'pfingsten_2026', name: 'Pfingstferien 2026', year: 2026, startMonth: 4, startDay: 25, endMonth: 4, endDay: 26, type: 'range' },
  { id: 'sommer_2026', name: 'Sommerferien 2026', year: 2026, startMonth: 6, startDay: 11, endMonth: 8, endDay: 13, type: 'range' },

  // Ranges 2026/27
  { id: 'herbst_2026', name: 'Herbstferien 2026', year: 2026, startMonth: 9, startDay: 26, endMonth: 10, endDay: 2, type: 'range' },
  { id: 'weihnachten_2026', name: 'Weihnachtsferien 2026/27', year: 2026, startMonth: 11, startDay: 24, endMonth: 11, endDay: 31, type: 'range' },
  { id: 'weihnachten_2027_start', name: 'Weihnachtsferien 2027', year: 2027, startMonth: 0, startDay: 1, endMonth: 0, endDay: 6, type: 'range' },
  { id: 'fasching_2027', name: 'Faschingsdienstag 2027', year: 2027, month: 1, day: 9, type: 'static' },
  { id: 'semester_2027', name: 'Semesterferien 2027', year: 2027, startMonth: 1, startDay: 15, endMonth: 1, endDay: 19, type: 'range' },
  { id: 'ostern_2027', name: 'Osterferien 2027', year: 2027, startMonth: 2, startDay: 20, endMonth: 2, endDay: 29, type: 'range' },
  { id: 'pfingsten_2027', name: 'Pfingstferien 2027', year: 2027, startMonth: 4, startDay: 15, endMonth: 4, endDay: 17, type: 'range' },
  { id: 'sommer_2027', name: 'Sommerferien 2027', year: 2027, startMonth: 6, startDay: 10, endMonth: 8, endDay: 12, type: 'range' },
];

export function getEaster(y: number): Date {
  const f = Math.floor,
    G = y % 19,
    C = f(y / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    m = 3 + f((L + 40) / 44),
    d = L + 28 - 31 * f(m / 4);
  return new Date(y, m - 1, d);
}

export function checkHoliday(date: Date, disabledHolidays: string[] = []): VOBSHoliday | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dTime = new Date(year, month, day).getTime();

  for (const h of VOBS_HOLIDAYS) {
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
          // Special case for cross-year ranges if needed, but here we defined them separately
          // except for some cases. Let's check year.
          // Sommerferien span across months and years are checked inside.
          if (h.id.includes('sommer') || h.id.includes('weihnachten')) {
             // allow check
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
