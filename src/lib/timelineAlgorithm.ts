import { AppState } from '../types';
import { STUNDEN_INFO, TAGE_NAMEN } from '../constants';
import { getKW } from './utils';

export interface TimelineUnit {
  id: string;
  idx: number; // 1-based lesson index, or -1 for pause
  label: string; // e.g. "1. Stunde" or "Pause"
  fach: string; // e.g. "Deutsch", "Pause", "Frei"
  shortFach: string; // e.g. "D", "M", "Pause", "Frei"
  isPause: boolean;
  isFrei: boolean;
  isVertretung: boolean;
  raum?: string;
  startMinutes: number; // minutes from 00:00
  endMinutes: number;
  startTimestamp: number; // epoch ms
  endTimestamp: number;
  colorKey: string;
}

export type TimelineStatusType = 'no_lessons' | 'before_school' | 'lesson' | 'pause' | 'after_school';

export interface TimelineState {
  status: TimelineStatusType;
  message: string;
  currentUnit: TimelineUnit | null;
  nextUnit: TimelineUnit | null;
  remainingMinutes: number;
  progressPct: number;
  totalUnits: number;
  completedUnits: number;
  startsInMinutes?: number;
}

/**
 * Parses time strings such as "08:00–08:50", "08:00-08:50", "8:00 - 8:50"
 */
export function parseTimeRange(timeStr: string): { startMinutes: number; endMinutes: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { startMinutes: 480, endMinutes: 530 };
  }

  const matches = timeStr.match(/\d{1,2}[:.]\d{2}/g);
  if (!matches || matches.length < 2) {
    // Try single numbers or digits
    const numMatches = timeStr.match(/\d{1,2}/g);
    if (numMatches && numMatches.length >= 2) {
      const h1 = parseInt(numMatches[0], 10);
      const h2 = parseInt(numMatches[1], 10);
      return { startMinutes: h1 * 60, endMinutes: h2 * 60 };
    }
    return { startMinutes: 480, endMinutes: 530 };
  }

  const parseMinutes = (s: string): number => {
    const clean = s.replace('.', ':');
    const [h, m] = clean.split(':').map((p) => parseInt(p, 10));
    return (h || 0) * 60 + (m || 0);
  };

  let startMinutes = parseMinutes(matches[0]);
  let endMinutes = parseMinutes(matches[1]);

  if (endMinutes <= startMinutes) {
    endMinutes = startMinutes + 50; // default 50-minute lesson
  }

  return { startMinutes, endMinutes };
}

/**
 * Formats minutes from midnight to "HH:MM"
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formats a range to "HH:MM–HH:MM"
 */
export function formatTimeRange(startMins: number, endMins: number): string {
  return `${formatMinutes(startMins)}–${formatMinutes(endMins)}`;
}

/**
 * Abbreviates subject names for compact blocks
 */
export function getShortSubjectName(fach: string): string {
  if (!fach) return 'Frei';
  const clean = fach.trim();
  if (clean === 'Pause') return 'Pause';
  if (clean === 'Frei' || clean === 'Freistunde' || clean === 'Freiarbeit') return 'Frei';
  if (clean.startsWith('Deutsch')) return 'D';
  if (clean.startsWith('Mathematik') || clean.toLowerCase() === 'mathe') return 'M';
  if (clean.startsWith('Sachunterricht') || clean.toLowerCase() === 'su') return 'SU';
  if (clean.startsWith('Englisch') || clean.toLowerCase() === 'e') return 'E';
  if (clean.startsWith('Religion') || clean.toLowerCase() === 'rel') return 'REL';
  if (clean.startsWith('Musikerziehung') || clean.startsWith('Musik') || clean.toLowerCase() === 'me') return 'ME';
  if (clean.startsWith('Bildnerische Erziehung') || clean.startsWith('BE') || clean.startsWith('Kunst')) return 'BE';
  if (clean.startsWith('Werken')) return 'WE';
  if (clean.startsWith('Bewegung und Sport') || clean.startsWith('BS') || clean.startsWith('Sport') || clean.startsWith('Turnen')) return 'BS';
  if (clean.startsWith('Türkisch')) return 'T';
  if (clean.length <= 4) return clean;
  return clean.slice(0, 3).toUpperCase();
}

/**
 * Resolves color key for a subject
 */
export function getFachColorKey(fachName?: string, appConfig?: Record<string, { color: string }>): string {
  if (!fachName) return 'slate';
  const lower = fachName.toLowerCase().trim();

  if (lower === 'pause') return 'amber';
  if (lower === 'frei' || lower === 'freistunde' || lower === 'freiarbeit') return 'slate';

  if (appConfig && appConfig[fachName]?.color) {
    const cfg = appConfig[fachName].color;
    if (cfg && cfg !== 'slate') return cfg;
  }

  if (lower.includes('deutsch')) return 'blue';
  if (lower.includes('mathematik') || lower.includes('mathe')) return 'red';
  if (lower.includes('sachunterricht') || lower === 'su') return 'emerald';
  if (lower.includes('englisch')) return 'sky';
  if (lower.includes('religion')) return 'indigo';
  if (lower.includes('bildnerische') || lower.includes('kunst')) return 'purple';
  if (lower.includes('werken') || lower.includes('technik')) return 'orange';
  if (lower.includes('bewegung') || lower.includes('sport') || lower.includes('turnen')) return 'teal';
  if (lower.includes('musik')) return 'pink';
  if (lower.includes('türkisch')) return 'rose';

  return 'slate';
}

/**
 * Returns German day of week name for a date
 */
export function getGermanDayName(date: Date): string {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return days[date.getDay()];
}

/**
 * Builds the timeline units for a given day
 */
export function buildDayTimeline(app: Partial<AppState> | undefined, date: Date): TimelineUnit[] {
  const dayName = getGermanDayName(date);
  const isWeekend = dayName === 'Samstag' || dayName === 'Sonntag';

  // If weekend and no explicit schedule, return empty
  if (isWeekend && (!app?.tageplan?.[dayName] || !app?.tageplan?.[dayName]?.stunden?.length)) {
    return [];
  }

  const dayPlan = app?.tageplan?.[dayName];
  let stundenIndices: number[] = [];

  if (dayPlan && Array.isArray(dayPlan.stunden)) {
    stundenIndices = dayPlan.stunden;
  } else if (app?.stammplan?.[dayName] && Object.keys(app.stammplan[dayName]).length > 0) {
    // Default to Monday-Friday 1..5 if stammplan has subjects for today
    stundenIndices = [1, 2, 3, 4, 5];
  } else if (TAGE_NAMEN.includes(dayName)) {
    // Standard school day fallback
    stundenIndices = [1, 2, 3, 4, 5];
  }

  if (!stundenIndices.length) {
    return [];
  }

  const stundenZeiten = app?.stundenZeiten || STUNDEN_INFO;
  const kw = getKW(date);
  const daysDe = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const dayIdx = daysDe.indexOf(dayName);

  const units: TimelineUnit[] = [];
  let lastEndMinutes = 0;

  // Base midnight for the day
  const midnightMs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();

  for (let i = 0; i < stundenIndices.length; i++) {
    const stundenIdx = stundenIndices[i];
    const timeStr = stundenZeiten[stundenIdx] || `${8 + i}:00–${8 + i}:50`;
    const { startMinutes, endMinutes } = parseTimeRange(timeStr);

    // If there is a noticeable break before this lesson (at least 2 minutes), insert a Pause unit
    if (lastEndMinutes > 0 && startMinutes >= lastEndMinutes + 2) {
      const pauseDuration = startMinutes - lastEndMinutes;
      units.push({
        id: `pause-${lastEndMinutes}-${startMinutes}`,
        idx: -1,
        label: pauseDuration >= 20 ? 'Große Pause' : 'Pause',
        fach: 'Pause',
        shortFach: 'Pause',
        isPause: true,
        isFrei: false,
        isVertretung: false,
        startMinutes: lastEndMinutes,
        endMinutes: startMinutes,
        startTimestamp: midnightMs + lastEndMinutes * 60000,
        endTimestamp: midnightMs + startMinutes * 60000,
        colorKey: 'amber',
      });
    }

    // Resolve lesson data
    let fach = '';
    let raum: string | undefined = undefined;
    let isVertretung = false;

    // 1. Check wochenplanung for current week
    if (app?.wochenplanung?.[kw]) {
      const wpDay = app.wochenplanung[kw][dayName] || (dayIdx !== -1 ? app.wochenplanung[kw][dayIdx] : null);
      if (wpDay) {
        const item = wpDay[stundenIdx - 1] || wpDay[stundenIdx];
        if (typeof item === 'string') {
          fach = item;
        } else if (item && typeof item === 'object') {
          fach = item.fach || '';
          raum = item.raum;
          if (item.vertretung || item.supplier || fach === 'Supplierstunde') {
            isVertretung = true;
          }
        }
      }
    }

    // 2. Fallback to stammplan
    if (!fach && app?.stammplan?.[dayName]) {
      const stammItem = app.stammplan[dayName][stundenIdx];
      if (typeof stammItem === 'string') {
        fach = stammItem;
      } else if (stammItem && typeof stammItem === 'object') {
        fach = (stammItem as any).fach || '';
        raum = (stammItem as any).raum;
      }
    }

    const isFrei = !fach || fach.toLowerCase() === 'frei' || fach.toLowerCase() === 'freistunde';
    const displayFach = isFrei ? 'Frei' : fach;
    const shortFach = isFrei ? 'Frei' : getShortSubjectName(fach);
    const colorKey = isFrei ? 'slate' : getFachColorKey(fach, app?.fachConfig as any);

    units.push({
      id: `lesson-${stundenIdx}`,
      idx: stundenIdx,
      label: `${stundenIdx}. Stunde`,
      fach: displayFach,
      shortFach,
      isPause: false,
      isFrei,
      isVertretung,
      raum,
      startMinutes,
      endMinutes,
      startTimestamp: midnightMs + startMinutes * 60000,
      endTimestamp: midnightMs + endMinutes * 60000,
      colorKey,
    });

    lastEndMinutes = endMinutes;
  }

  return units;
}

/**
 * Evaluates current timeline status and next lesson from timestamp
 */
export function getTimelineStatus(units: TimelineUnit[], now: Date): TimelineState {
  if (!units || units.length === 0) {
    return {
      status: 'no_lessons',
      message: 'Heute kein Unterricht eingetragen',
      currentUnit: null,
      nextUnit: null,
      remainingMinutes: 0,
      progressPct: 0,
      totalUnits: 0,
      completedUnits: 0,
    };
  }

  const nowMs = now.getTime();
  const firstUnit = units[0];
  const lastUnit = units[units.length - 1];

  // 1. Before school begins
  if (nowMs < firstUnit.startTimestamp) {
    const msToStart = firstUnit.startTimestamp - nowMs;
    const minutesToStart = Math.max(1, Math.ceil(msToStart / 60000));
    return {
      status: 'before_school',
      message: `Unterricht beginnt um ${formatMinutes(firstUnit.startMinutes)}`,
      startsInMinutes: minutesToStart,
      currentUnit: null,
      nextUnit: firstUnit,
      remainingMinutes: minutesToStart,
      progressPct: 0,
      totalUnits: units.length,
      completedUnits: 0,
    };
  }

  // 2. After school ends
  if (nowMs >= lastUnit.endTimestamp) {
    return {
      status: 'after_school',
      message: 'Schultag beendet',
      currentUnit: null,
      nextUnit: null,
      remainingMinutes: 0,
      progressPct: 100,
      totalUnits: units.length,
      completedUnits: units.length,
    };
  }

  // 3. During school hours: find active unit (start <= now < end)
  const currentIdx = units.findIndex((u) => nowMs >= u.startTimestamp && nowMs < u.endTimestamp);

  if (currentIdx !== -1) {
    const currentUnit = units[currentIdx];
    const msRemaining = currentUnit.endTimestamp - nowMs;
    const remainingMinutes = Math.max(0, Math.ceil(msRemaining / 60000));
    const totalDurationMs = currentUnit.endTimestamp - currentUnit.startTimestamp;
    const elapsedMs = nowMs - currentUnit.startTimestamp;
    const progressPct = totalDurationMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100)) : 0;

    // Next unit is next in list
    const nextUnit = units[currentIdx + 1] || null;

    const isPause = currentUnit.isPause;
    const message = isPause
      ? `Pause · noch ${remainingMinutes} Min`
      : `${currentUnit.fach} · noch ${remainingMinutes} Min`;

    return {
      status: isPause ? 'pause' : 'lesson',
      message,
      currentUnit,
      nextUnit,
      remainingMinutes,
      progressPct,
      totalUnits: units.length,
      completedUnits: currentIdx,
    };
  }

  // Fallback if between units gap not caught by pause
  const nextIdx = units.findIndex((u) => u.startTimestamp > nowMs);
  const nextUnit = nextIdx !== -1 ? units[nextIdx] : null;

  return {
    status: 'pause',
    message: 'Pause',
    currentUnit: null,
    nextUnit,
    remainingMinutes: nextUnit ? Math.max(1, Math.ceil((nextUnit.startTimestamp - nowMs) / 60000)) : 0,
    progressPct: 0,
    totalUnits: units.length,
    completedUnits: nextIdx !== -1 ? nextIdx : units.length,
  };
}
