/**
 * noisescalesAlgorithm.ts
 * F-UI Standard-konforme Logik für das Lautstärkeskalen-Widget (widget-noisescales) in F13.
 *
 * Fachliche Rolle:
 * „Wie laut dürfen wir gerade sein?“
 * Pädagogische Zielvorgabe der Lehrkraft für die aktuelle Arbeitsform (Stimmlautstärke).
 *
 * Abgrenzung:
 * - NOISEMETER misst den tatsächlichen physikalischen Pegel.
 * - TRAFFICLIGHT zeigt den Arbeitsmodus (Zuhören / Leise / Austausch / Pause).
 * - NOISESCALES zeigt die erlaubte akustische Stimmlautstärke (0 Stille bis 4 Präsentation).
 */

export type NoiseScaleId = 'stille' | 'fluestern' | 'partner' | 'gespraech' | 'praesentation';

export interface NoiseScaleStage {
  id: NoiseScaleId;
  level: number;
  label: string;
  icon: string;
  shortLabel: string;
  description: string;
  classroomRule: string;
  colorName: 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose';
  accentBorder: string;
  activeBg: string;
  textColor: string;
}

export const NOISE_SCALE_STAGES: NoiseScaleStage[] = [
  {
    id: 'stille',
    level: 0,
    label: 'Stille',
    shortLabel: 'Stille',
    icon: '🤫',
    description: 'Kein Flüstern & absolute Ruhe',
    classroomRule: 'Stillarbeit, Prüfung & tiefes Nachdenken',
    colorName: 'indigo',
    accentBorder: 'border-indigo-500',
    activeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    textColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'fluestern',
    level: 1,
    label: 'Flüstern',
    shortLabel: 'Flüstern',
    icon: '🤏',
    description: 'Nur dein direkter Nachbar hört dich',
    classroomRule: 'Kurze Rückfrage im Flüsterton',
    colorName: 'sky',
    accentBorder: 'border-sky-500',
    activeBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'partner',
    level: 2,
    label: 'Partnerlautstärke',
    shortLabel: 'Partner',
    icon: '👥',
    description: 'Zwei sprechen leise miteinander',
    classroomRule: 'Austausch zu zweit, die Nachbartische hören nichts',
    colorName: 'emerald',
    accentBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'gespraech',
    level: 3,
    label: 'Gespräch',
    shortLabel: 'Gruppe',
    icon: '💬',
    description: 'Gruppenarbeit in normaler Zimmerlautstärke',
    classroomRule: 'Austausch im Team am Tisch',
    colorName: 'amber',
    accentBorder: 'border-amber-500',
    activeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'praesentation',
    level: 4,
    label: 'Präsentation',
    shortLabel: 'Vortrag',
    icon: '🎤',
    description: 'Laut & deutlich für den ganzen Raum',
    classroomRule: 'Vortrag, Vorlesen oder Wortmeldung vor der Klasse',
    colorName: 'rose',
    accentBorder: 'border-rose-500',
    activeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
];

export interface NoiseScalesSettings {
  activeScaleId: NoiseScaleId;
}

export const DEFAULT_NOISE_SCALES_SETTINGS: NoiseScalesSettings = {
  activeScaleId: 'fluestern',
};

/**
 * Holt eine Stufe anhand ihrer ID oder liefert Fallback
 */
export function getNoiseScaleStage(id?: string): NoiseScaleStage {
  const stage = NOISE_SCALE_STAGES.find((s) => s.id === id);
  return stage || NOISE_SCALE_STAGES[1]; // Fallback 'fluestern'
}

/**
 * Migration alter numerischer Level (0, 1, 2, 3) auf F13 IDs
 */
export function migrateLegacyScaleLevel(legacyLevel?: number | string): NoiseScaleId {
  if (typeof legacyLevel === 'number') {
    if (legacyLevel === 0) return 'stille';
    if (legacyLevel === 1) return 'fluestern';
    if (legacyLevel === 2) return 'partner';
    if (legacyLevel === 3) return 'gespraech';
    if (legacyLevel === 4) return 'praesentation';
  }
  if (typeof legacyLevel === 'string') {
    const matched = NOISE_SCALE_STAGES.find((s) => s.id === legacyLevel);
    if (matched) return matched.id;
  }
  return 'fluestern';
}
