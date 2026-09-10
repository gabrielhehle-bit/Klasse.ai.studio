/**
 * clockAlgorithm.ts
 * F-UI Standard-konforme Zeit- und Uhrenberechnungen für das Cockpit-Widget (F11).
 * 100% offline, deterministisch, ohne KI oder externe Netzwerkaufrufe.
 */

export type ClockMode = 'digital' | 'analog' | 'both';

export interface ClockSettings {
  mode: ClockMode;
  showSeconds: boolean;
  showDate: boolean;
  showLearningText?: boolean;
}

export const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  mode: 'digital',
  showSeconds: false,
  showDate: true,
  showLearningText: false,
};

/**
 * Liefert formatierte digitale Komponenten (zweistellig, führende Nullen)
 */
export function formatDigitalTime(
  date: Date,
  showSeconds: boolean = false
): {
  hours: string;
  minutes: string;
  seconds: string;
  timeString: string;
} {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  const timeString = showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;

  return {
    hours: h,
    minutes: m,
    seconds: s,
    timeString,
  };
}

/**
 * Berechnet Zeigerwinkel in Grad für die Analog-Uhr
 * 0° = 12 Uhr (oben)
 */
export function getAnalogAngles(
  date: Date,
  smooth: boolean = true
): {
  hourDeg: number;
  minuteDeg: number;
  secondDeg: number;
} {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Stundenzeiger: 30° pro Stunde + 0.5° pro Minute (+ 0.5°/60 bei smooth)
  const hourDeg = smooth
    ? hours * 30 + minutes * 0.5 + (seconds / 120)
    : hours * 30 + minutes * 0.5;

  // Minutenzeiger: 6° pro Minute (+ 0.1° pro Sekunde bei smooth)
  const minuteDeg = smooth ? minutes * 6 + seconds * 0.1 : minutes * 6;

  // Sekundenzeiger: 6° pro Sekunde
  const secondDeg = seconds * 6;

  return {
    hourDeg: Math.round(hourDeg * 100) / 100,
    minuteDeg: Math.round(minuteDeg * 100) / 100,
    secondDeg: Math.round(secondDeg * 100) / 100,
  };
}

const WOCHENTAGE_LANG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];

const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const MONATE_LANG = [
  'Jänner', // Österreichischer Standard: Jänner
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const MONATE_KURZ = [
  'Jän',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

/**
 * Formatiert das Datum kindgerecht und übersichtlich.
 * In Österreich wird im Kalender bevorzugt "Jänner" genutzt.
 */
export function formatClockDate(date: Date, isCompact: boolean = false): string {
  const dayName = isCompact
    ? WOCHENTAGE_KURZ[date.getDay()]
    : WOCHENTAGE_LANG[date.getDay()];
  const dayNum = date.getDate();
  const monthName = isCompact
    ? MONATE_KURZ[date.getMonth()]
    : MONATE_LANG[date.getMonth()];

  if (isCompact) {
    return `${dayName}, ${dayNum}. ${monthName}`;
  }

  return `${dayName}, ${dayNum}. ${monthName}`;
}

const STUNDEN_WOERTER: Record<number, string> = {
  0: 'zwölf',
  1: 'eins',
  2: 'zwei',
  3: 'drei',
  4: 'vier',
  5: 'fünf',
  6: 'sechs',
  7: 'sieben',
  8: 'acht',
  9: 'neun',
  10: 'zehn',
  11: 'elf',
  12: 'zwölf',
};

/**
 * Kindgerechte sprachliche Zeitdarstellung (für Volksschule / Grundschule)
 * Neutral formuliert, für Österreich passend.
 */
export function getSpokenTime(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();

  const currentHour12 = hours24 % 12 || 12;
  const nextHour12 = (hours24 + 1) % 12 || 12;

  const curWord = STUNDEN_WOERTER[currentHour12];
  const nextWord = STUNDEN_WOERTER[nextHour12];

  if (minutes === 0) {
    return `${curWord === 'eins' ? 'Ein' : capitalize(curWord)} Uhr`;
  }
  if (minutes === 5) {
    return `Fünf nach ${curWord}`;
  }
  if (minutes === 10) {
    return `Zehn nach ${curWord}`;
  }
  if (minutes === 15) {
    return `Viertel nach ${curWord}`;
  }
  if (minutes === 20) {
    return `Zwanzig nach ${curWord}`;
  }
  if (minutes === 25) {
    return `Fünf vor halb ${nextWord}`;
  }
  if (minutes === 30) {
    return `Halb ${nextWord}`;
  }
  if (minutes === 35) {
    return `Fünf nach halb ${nextWord}`;
  }
  if (minutes === 40) {
    return `Zwanzig vor ${nextWord}`;
  }
  if (minutes === 45) {
    return `Viertel vor ${nextWord}`;
  }
  if (minutes === 50) {
    return `Zehn vor ${nextWord}`;
  }
  if (minutes === 55) {
    return `Fünf vor ${nextWord}`;
  }

  // Für ungerade Minuten: gerundete oder einfache Annäherung
  if (minutes < 30) {
    return `${minutes} Minuten nach ${curWord}`;
  }
  return `${60 - minutes} Minuten vor ${nextWord}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
