import { checkHoliday, getFerien, type Bundesland } from './ferienOesterreich';

export type DashboardPreviewMode = 'automatik' | 'heute' | 'morgen';
export type DashboardFreeDayKind = 'weekend' | 'vacation' | 'holiday' | 'school-free';
export type DashboardFreeDayMessage = {
  kind: DashboardFreeDayKind;
  title: string;
  message: string;
};

/** An auto preview is only a look-ahead, not a replacement for today's date.
 * In particular, Saturday/Sunday and school-free days must remain on today.
 * Explicit "morgen" and manual day navigation remain available.
 */
export function getDashboardDisplayDate(
  now: Date,
  mode: DashboardPreviewMode,
  previewHour: number,
  manualOffset = 0,
  todayIsSchoolFree = false,
): { date: Date; preview: string | null } {
  const date = new Date(now);
  if (manualOffset !== 0) {
    date.setDate(date.getDate() + manualOffset);
    return { date, preview: 'Manuell' };
  }
  if (mode === 'heute') return { date, preview: null };
  const weekday = date.getDay();
  if (mode === 'automatik' && (weekday === 0 || weekday === 6 || todayIsSchoolFree)) {
    return { date, preview: null };
  }
  if (mode === 'morgen') {
    const skip = weekday === 5 ? 3 : weekday === 6 ? 2 : 1;
    date.setDate(date.getDate() + skip);
    date.setHours(8, 0, 0, 0);
    return { date, preview: 'Morgen' };
  }
  if (date.getHours() < previewHour) return { date, preview: null };
  const skip = weekday === 5 ? 3 : 1;
  date.setDate(date.getDate() + skip);
  date.setHours(8, 0, 0, 0);
  return { date, preview: weekday === 5 ? 'Montag' : 'Morgen' };
}

/** For the active federal state, prefer the named school break to the
 * overlapping statutory holiday and to the generic weekend message.
 * Use only dates already present in the app's calendar; no guessed autonomous
 * school days or invented winter breaks.
 */
export function getDashboardFreeDayMessage(
  date: Date,
  federalState: Bundesland = 'VBG',
  disabledHolidays: string[] = [],
  calendarOverride?: 'school' | 'free',
): DashboardFreeDayMessage | null {
  if (calendarOverride === 'school') return null;
  if (calendarOverride === 'free') {
    return { kind: 'school-free', title: 'Heute ist schulfrei! 🌿', message: 'Genieße deinen freien Tag. Deine Planung bleibt jederzeit erreichbar.' };
  }
  const state: Bundesland = (['W','NOE','BGL','KTN','OOE','SBG','STMK','T','VBG'] as string[]).includes(federalState)
    ? federalState : 'VBG';
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dayKey = Date.UTC(year, month, day);
  // September may still belong to the previous summer break: inspect the two
  // neighbouring school years without relying on the user's selected class year.
  const startYears = [year - 1, year].filter(start => start >= 2025 && start <= 2029);
  for (const startYear of startYears) {
    const schoolYear = `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
    for (const holiday of getFerien(state, schoolYear)) {
      if (holiday.type !== 'range' || disabledHolidays.includes(holiday.id)) continue;
      if (holiday.year === undefined || holiday.startMonth === undefined || holiday.startDay === undefined ||
          holiday.endMonth === undefined || holiday.endDay === undefined) continue;
      const from = Date.UTC(holiday.year, holiday.startMonth, holiday.startDay);
      const to = Date.UTC(holiday.year, holiday.endMonth, holiday.endDay);
      if (dayKey < from || dayKey > to) continue;
      const name = holiday.name.replace(/\s+\d{4}(?:\/\d{2})?$/, '').trim();
      return {
        kind: 'vacation',
        title: `Schöne ${name}! 🌞`,
        message: `${name} – Zeit zum Erholen. Deine Aufgaben und Planungen bleiben für später verfügbar.`,
      };
    }
  }
  const publicHoliday = checkHoliday(date, disabledHolidays, state);
  if (publicHoliday && publicHoliday.type !== 'range') {
    return {
      kind: 'holiday',
      title: 'Schönen Feiertag! ✨',
      message: `Heute ist ${publicHoliday.name}. Genieße den freien Tag.`,
    };
  }
  if (date.getDay() === 0 || date.getDay() === 6) {
    return {
      kind: 'weekend',
      title: 'Schönes Wochenende! ☀️',
      message: `Heute ist ${date.getDay() === 0 ? 'Sonntag' : 'Samstag'}. Genieße deine freie Zeit – der nächste Schultag wartet nicht im Dashboard auf dich.`,
    };
  }
  return null;
}
