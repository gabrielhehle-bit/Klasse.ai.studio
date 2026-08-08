
import { STUNDEN_INFO, VM_ZEITEN } from '../constants';
import { checkHoliday } from './ferienOesterreich';

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed === null || parsed === undefined) ? fallback : parsed;
  } catch (e) {
    console.warn('[safeJsonParse] Ungültiges JSON ignoriert', e);
    return fallback;
  }
}

export function getKW(d: Date): number {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt.getTime() - y.getTime()) / 86400000) + 1) / 7);
}

export function sortYearlySubjects(subjects: any[]) {
  return [...subjects].map((s, index) => ({...s, _originalIndex: index})).sort((a, b) => {
    const getPriority = (label: string) => {
      const lower = label.toLowerCase();
      if (lower.includes('deutsch')) return 1;
      if (lower.includes('mathematik') || lower === 'mathe') return 2;
      if (lower.includes('sachunterricht') || lower === 'su') return 3;
      return 4;
    };
    const prioA = getPriority(a.label);
    const prioB = getPriority(b.label);
    if (prioA !== prioB) return prioA - prioB;
    return a._originalIndex - b._originalIndex;
  }).map(s => {
    const { _originalIndex, ...rest } = s;
    return rest;
  });
}

export function kwToMonday(kw: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const kw1Monday = new Date(jan4);
  kw1Monday.setDate(jan4.getDate() - (dayOfWeek - 1));
  const monday = new Date(kw1Monday);
  monday.setDate(kw1Monday.getDate() + (kw - 1) * 7);
  return monday;
}

export function rundeNote(avg: number | null): number | null {
  if (avg === null || isNaN(avg)) return null;
  const v = Math.round(avg * 100) / 100;
  if (v <= 1.50) return 1;
  if (v <= 2.50) return 2;
  if (v <= 3.50) return 3;
  if (v <= 4.50) return 4;
  return 5;
}

export function fmtNote2(avg: number | null): string {
  if (avg === null) return '–';
  return (Math.round(avg * 100) / 100).toFixed(2);
}

export function getTodayName(date?: Date): string | null {
  const d = (date || new Date()).getDay();
  const TAGE_NAMEN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  return (d >= 1 && d <= 5) ? TAGE_NAMEN[d - 1] : null;
}

export function getCurrentSchuljahr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // School year in AT ends early July (~6), starts early Sept (~8)
  // If we are in July or August, we are already in the "next" school year's planning phase
  if (month >= 6) {
    const nextYear = (year + 1).toString().slice(-2);
    return `${year}/${nextYear}`;
  }
  const thisYear = year.toString().slice(-2);
  return `${year - 1}/${thisYear}`;
}

export function getStartYear(schuljahr: string): number {
  if (!schuljahr) return new Date().getFullYear();
  const m = schuljahr.match(/(\d{4})/);
  if (m) return parseInt(m[1]);
  const shortMatch = schuljahr.match(/^(\d{2})\//);
  if (shortMatch) return 2000 + parseInt(shortMatch[1]);
  return new Date().getFullYear();
}

export function getSchulstartKW(schuljahr: string, bundesland: string = 'VBG'): number {
  const startYear = getStartYear(schuljahr);
  // Ostösterreich (W, NOE, BGL) starts on the first Monday of September.
  // Westösterreich (VBG, T, S, OOE, STMK, K) starts on the second Monday of September.
  const sept1 = new Date(startYear, 8, 1);
  const dayOfWeek = sept1.getDay() || 7;
  const firstMonday = dayOfWeek === 1 ? sept1 : new Date(startYear, 8, 1 + (8 - dayOfWeek));
  
  if (bundesland === 'W' || bundesland === 'NOE' || bundesland === 'BGL') {
    return getKW(firstMonday);
  } else {
    const secondMonday = new Date(firstMonday);
    secondMonday.setDate(firstMonday.getDate() + 7);
    return getKW(secondMonday);
  }
}

export function kwYear(kw: number, startYear: number, bundesland: string = 'VBG'): number {
  // Use startYear for the first semester, startYear + 1 for the second
  // In Vorarlberg (VBG) school usually starts in KW 37. In Vienna, it starts in KW 36.
  const startKW = (bundesland === 'W' || bundesland === 'NOE' || bundesland === 'BGL') ? 36 : 37; 
  return kw >= startKW ? startYear : startYear + 1;
}

export function getSW(date: Date, schuljahr: string, bundesland: string = 'VBG'): number | null {
  const startKW = getSchulstartKW(schuljahr, bundesland);
  const startYear = getStartYear(schuljahr);
  const startMonday = kwToMonday(startKW, startYear);
  
  // Find the Monday of the given date
  const d = new Date(date);
  const day = d.getDay() || 7;
  const currentMonday = new Date(d);
  currentMonday.setDate(d.getDate() - (day - 1));
  currentMonday.setHours(0,0,0,0);
  startMonday.setHours(0,0,0,0);
  
  // Calculate difference in weeks
  const diffTime = currentMonday.getTime() - startMonday.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
  
  const sw = diffWeeks + 1;
  
  // Return SW if it's within a reasonable range for a school year
  if (sw >= 1 && sw <= 53) return sw;
  return null;
}

export function isHoliday(date: Date, disabledHolidays: string[] = [], bundesland: any = 'VBG'): string | null {
  const h = checkHoliday(date, disabledHolidays, bundesland);
  return h ? h.name : null;
}

export function logActivity(setApp: any, action: string, entityType: string, entityId?: string) {
  setApp((prev: any) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      action,
      entityType,
      entityId
    };
    const newLog = [newEntry, ...(prev.activityLog || [])].slice(0, 50);
    return { ...prev, activityLog: newLog };
  });
}

export function logObservation(setApp: any, studentId: string | undefined, text: string, kategorie: any = 'Journal', source: string = 'Direkteingabe') {
  if (!text || text.trim() === '') return;
  setApp((prev: any) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      schuelerId: studentId,
      datum: new Date().toISOString(),
      inhalt: text.trim(),
      kategorie,
      quelle: source,
    };
    const newNotes = [newEntry, ...(prev.notes || [])];
    const newJournal = [newEntry, ...(prev.journal || [])];
    return { ...prev, notes: newNotes, journal: newJournal };
  });
}

export function logStatusChange(setApp: any, studentId: string, iconId: string) {
  setApp((prev: any) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      schuelerId: studentId,
      datum: new Date().toISOString().split('T')[0],
      iconId: iconId,
      timestamp: Date.now()
    };
    const newLog = [newEntry, ...(prev.statusLog || [])];
    return { ...prev, statusLog: newLog };
  });
}

export function miZuNote(striche: number): number {
  if (striche >= 20) return 1;
  if (striche >= 15) return 2;
  if (striche >= 10) return 3;
  if (striche >= 5) return 4;
  return 5;
}

export function getSemester(dateStr: string): 1 | 2 {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const day = d.getDate();

  // Precise Semester split for Vorarlberg
  if (year === 2026) {
    // 2025/26: 1. Semester ends Fr 06.02.2026
    if (month === 1 && day <= 6) return 1;
    if (month === 1 && day >= 7) return 2; // Including Semesterferien as start of 2. Sem context or planning
  }
  if (year === 2027) {
    // 2026/27: 1. Semester ends Fr 12.02.2027
    if (month === 1 && day <= 12) return 1;
    if (month === 1 && day >= 13) return 2;
  }

  // Fallback: Sept - Jan (8, 9, 10, 11, 0) is Semester 1
  // Feb - Aug (1, 2, 3, 4, 5, 6, 7) is Semester 2
  if (month >= 1 && month <= 7) return 2;
  return 1;
}

export async function getSpeicherStatus(): Promise<{
  localStorageBytes: number;
  indexedDbBytes: number | null;
  quotaBytes: number | null;
  groessteEintraege: { key: string; bytes: number }[];
}> {
  let localStorageBytes = 0;
  const eintraege: { key: string; bytes: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const val = localStorage.getItem(key) || '';
    const bytes = (key.length + val.length) * 2; // UTF-16
    localStorageBytes += bytes;
    eintraege.push({ key, bytes });
  }
  eintraege.sort((a, b) => b.bytes - a.bytes);

  let indexedDbBytes: number | null = null;
  let quotaBytes: number | null = null;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      indexedDbBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    }
  } catch (e) { /* nicht unterstützt – null lassen */ }

  return { localStorageBytes, indexedDbBytes, quotaBytes, groessteEintraege: eintraege.slice(0, 8) };
}

export function getAccentTextColor(hexColor: string): string {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // YIQ weightings for human perceived light reflectance
  const relativeLuminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return relativeLuminance > 0.5 ? '#0f172a' : '#ffffff';
}

export function inferDateFromText(text: string, schuljahr: string): Date | null {
  const startYear = getStartYear(schuljahr);
  const ln = text.toLowerCase().trim();

  // Relative Date Parsing in German
  if (/\bheute\b/i.test(ln)) {
    return new Date();
  }
  if (/\bmorgen\b/i.test(ln)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (/\bübermorgen\b/i.test(ln)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  }

  const wochentage = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
  for (let i = 0; i < wochentage.length; i++) {
    const regexAm = new RegExp(`\\b(am|nächsten|kommenden|diesen)\\s+${wochentage[i]}\\b`, 'i');
    if (regexAm.test(ln)) {
      const d = new Date();
      const currentDay = d.getDay();
      let daysToAdd = i - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next occurrence
      }
      d.setDate(d.getDate() + daysToAdd);
      return d;
    }
  }
  
  // 1. Match DD.MM.YYYY or DD.MM.
  const dotDateRegex = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})?\b/;
  const dotMatch = text.match(dotDateRegex);
  if (dotMatch) {
    const day = parseInt(dotMatch[1], 10);
    const month = parseInt(dotMatch[2], 10) - 1; // 0-indexed
    let year = dotMatch[3] ? parseInt(dotMatch[3], 10) : startYear;
    if (!dotMatch[3]) {
      // infer based on school year: September to December is startYear, others startYear+1
      year = month >= 8 ? startYear : startYear + 1;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Match DD. MonthName
  const monthNames = ['jänner', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember', 'januar'];
  const wordDateRegex = /\b(\d{1,2})\.\s*([a-äÄöÖüÜßa-zA-Z]+)\b/i;
  const wordMatch = text.match(wordDateRegex);
  if (wordMatch) {
    const day = parseInt(wordMatch[1], 10);
    const monthWord = wordMatch[2].toLowerCase();
    let monthIdx = monthNames.indexOf(monthWord);
    if (monthIdx === 12) monthIdx = 0; // map 'januar' to 0
    if (monthIdx !== -1) {
      let year = monthIdx >= 8 ? startYear : startYear + 1;
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export function inferEventType(text: string): 'spielefest' | 'konferenz' | 'gespraech' | 'event' | 'test' | 'sonstiges' {
  const ln = text.toLowerCase();
  if (ln.includes('spielefest') || ln.includes('sportfest') || ln.includes('schulfest') || ln.includes('fest') || ln.includes('party')) {
    return 'spielefest';
  }
  if (ln.includes('konferenz') || ln.includes('lehrerkonferenz') || ln.includes('notenkonferenz') || ln.includes('konferenzen')) {
    return 'konferenz';
  }
  if (ln.includes('gespräch') || ln.includes('gespräche') || ln.includes('elterngespräch') || ln.includes('kel') || ln.includes('sprechstunde') || ln.includes('beratung') || ln.includes('telefonat')) {
    return 'gespraech';
  }
  if (ln.includes('ausflug') || ln.includes('wandertag') || ln.includes('exkursion') || ln.includes('theater') || ln.includes('kino') || ln.includes('museum') || ln.includes('zoo')) {
    return 'event';
  }
  if (ln.includes('test') || ln.includes('schularbeit') || ln.includes('sa') || ln.includes('lzk') || ln.includes('überprüfung') || ln.includes('wh')) {
    return 'test';
  }
  return 'sonstiges';
}

export function syncNoteToPlanning(text: string, setApp: any, schuljahr: string) {
  const date = inferDateFromText(text, schuljahr);
  if (!date) return;
  
  const kw = getKW(date);
  const eventType = inferEventType(text);
  
  const TAGE_NAMEN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const jDay = date.getDay(); // 0 = sun, 1 = mon ...
  const dayName = (jDay >= 1 && jDay <= 5) ? TAGE_NAMEN[jDay - 1] : 'Montag';

  setApp((prev: any) => {
    // 1. Sync to Jahresplanung
    const jpObj = { ...(prev.jahresplanung || {}) };
    const currentKwJp = { ...(jpObj[kw] || {}) };
    const existingSonstiges = currentKwJp['sonstiges'] || {};
    
    // Check if term already exists under sonstiges to avoid duplicates
    let updatedThema = existingSonstiges.thema || '';
    if (!updatedThema.includes(text)) {
      updatedThema = updatedThema ? `${updatedThema} & ${text}` : text;
    }
    
    currentKwJp['sonstiges'] = {
      ...existingSonstiges,
      thema: updatedThema,
      buch: existingSonstiges.buch || '',
      type: eventType,
      subCategory: 'termin',
      subCategories: ['termin'],
      items: existingSonstiges.items || []
    };
    jpObj[kw] = currentKwJp;

    // 2. Sync to Wochenplanung
    const wpObj = { ...(prev.wochenplanung || {}) };
    const currentKwWp = { ...(wpObj[kw] || {}) };
    const currentDayWp = { ...(currentKwWp[dayName] || {}) };
    
    // Find if this text already exists in any lesson of that day to avoid duplication
    let alreadyExists = false;
    let emptySlotIdx = -1;
    for (let i = 0; i < 6; i++) {
      if (currentDayWp[i]?.thema === text) {
        alreadyExists = true;
        break;
      }
      if (emptySlotIdx === -1 && (!currentDayWp[i] || !currentDayWp[i].fach)) {
        emptySlotIdx = i;
      }
    }

    if (!alreadyExists) {
      const slot = emptySlotIdx !== -1 ? emptySlotIdx : 5; // fallback to 6th hour
      currentDayWp[slot] = {
        ...(currentDayWp[slot] || {}),
        fach: 'Termin', // Mark as "Termin"
        thema: text,
        type: eventType,
        erledigt: false
      };
      currentKwWp[dayName] = currentDayWp;
      wpObj[kw] = currentKwWp;
    }

    return {
      ...prev,
      jahresplanung: jpObj,
      wochenplanung: wpObj
    };
  });
}


