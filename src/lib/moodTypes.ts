/**
 * Tägliche Stimmungs-Skala für den Kinder-Check-in und die Klassen- & Dossierauswertungen.
 * 
 * WICHTIG:
 * 1 = sehr gut (😄)
 * 2 = gut (🙂)
 * 3 = okay / neutral (😐)
 * 4 = eher schlecht (😕)
 * 5 = sehr schlecht (😞)
 * 
 * Kleinere Werte bedeuten bessere Stimmung.
 * Größere Werte bedeuten schlechtere Stimmung.
 * Sinkender Durchschnitt = Verbesserung.
 * Steigender Durchschnitt = Verschlechterung.
 */

export interface MoodMeta {
  value: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const KID_MOOD_SCALE: readonly MoodMeta[] = [
  {
    value: 1,
    emoji: '😄',
    label: 'Sehr gut',
    shortLabel: 'Sehr gut',
    description: 'Voller Energie, fröhlich und motiviert',
    color: '#10b981',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  {
    value: 2,
    emoji: '🙂',
    label: 'Gut',
    shortLabel: 'Gut',
    description: 'Zufrieden, entspannt und aufmerksam',
    color: '#3b82f6',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
  },
  {
    value: 3,
    emoji: '😐',
    label: 'Okay',
    shortLabel: 'Okay',
    description: 'Geht so, ganz normaler Tag',
    color: '#64748b',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
  },
  {
    value: 4,
    emoji: '🙁',
    label: 'Nicht so gut',
    shortLabel: 'Nicht so gut',
    description: 'Müde, unrund oder etwas bedrückt',
    color: '#f59e0b',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-750',
    badgeBorder: 'border-amber-200',
  },
  {
    value: 5,
    emoji: '😢',
    label: 'Schlecht',
    shortLabel: 'Schlecht',
    description: 'Traurig, unwohl, verärgert oder belastet',
    color: '#ef4444',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
  },
] as const;

export function getMoodMeta(value: number): MoodMeta | undefined {
  return KID_MOOD_SCALE.find((m) => m.value === value);
}

/**
 * Ruhige, nicht-diagnostische Zusammenfassung für das Wirgefühl (Regelbasiert, ohne KI)
 */
export function getCalmMoodSummary(avg: number | null | undefined): string {
  if (avg === null || avg === undefined || isNaN(avg)) {
    return 'Keine Angaben';
  }
  if (avg <= 1.5) {
    return 'überwiegend sehr positiv';
  }
  if (avg <= 2.5) {
    return 'überwiegend positiv';
  }
  if (avg <= 3.5) {
    return 'gemischt';
  }
  return 'heute eher gedrückt';
}

/**
 * Textuelle Umschreibung für Durchschnittswerte (1 bis 5).
 * 1 = Beste Stimmung, 5 = Schlechteste Stimmung.
 */
export function formatMoodAverage(avg: number | null | undefined): {
  label: string;
  emoji: string;
  colorClass: string;
} {
  if (avg === null || avg === undefined || isNaN(avg)) {
    return { label: 'Keine Daten', emoji: '–', colorClass: 'text-slate-400' };
  }
  if (avg <= 1.5) {
    return { label: 'Überwiegend sehr positiv', emoji: '😄', colorClass: 'text-emerald-600' };
  }
  if (avg <= 2.5) {
    return { label: 'Überwiegend positiv', emoji: '🙂', colorClass: 'text-sky-600' };
  }
  if (avg <= 3.5) {
    return { label: 'Gemischt', emoji: '😐', colorClass: 'text-slate-600' };
  }
  return { label: 'Heute eher gedrückt', emoji: '🙁', colorClass: 'text-amber-600' };
}

/**
 * Berechnet aggregierte Statistiken für einen bestimmten Tag oder Schüler.
 */
export interface AggregatedMoodStats {
  totalCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  distributionPct: Record<1 | 2 | 3 | 4 | 5, number>;
  average: number | null;
}

export function computeAggregatedMoodStats(values: number[]): AggregatedMoodStats {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  const valid = values.filter((v) => v >= 1 && v <= 5) as (1 | 2 | 3 | 4 | 5)[];
  for (const v of valid) {
    distribution[v] = (distribution[v] || 0) + 1;
  }

  const total = valid.length;
  const distributionPct: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: total > 0 ? Math.round((distribution[1] / total) * 100) : 0,
    2: total > 0 ? Math.round((distribution[2] / total) * 100) : 0,
    3: total > 0 ? Math.round((distribution[3] / total) * 100) : 0,
    4: total > 0 ? Math.round((distribution[4] / total) * 100) : 0,
    5: total > 0 ? Math.round((distribution[5] / total) * 100) : 0,
  };

  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : null;

  return {
    totalCount: total,
    distribution,
    distributionPct,
    average,
  };
}
