/**
 * noisemeterAlgorithm.ts
 * F-UI Standard-konforme Logik für das Lärmmessungs-Widget (widget-noisemeter) in F13.
 *
 * Fachliche Rolle:
 * „Wie laut ist es gerade wirklich?“
 * Reines Messinstrument zur objektiven akustischen Orientierung.
 *
 * Pädagogische Prinzipien & Datenschutz:
 * - KEINE Verhaltensbewertung (keine Strafen, keine Noten, keine brave/schlechte Klasse).
 * - KEINE Speicherung, Aufzeichnung oder Übertragung von Audiodaten (100% offline).
 * - Keine scheinbar kalibrierten Pseudo-dB, sondern relative kindgerechte Stufen.
 * - Glättung (Exponential Moving Average) gegen hektische Ausschläge.
 */

export type NoisePermissionState = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable';

export type SensitivityLevel = 'low' | 'normal' | 'high';

export interface NoiseClassification {
  levelIndex: number; // 0..4
  label: string;
  icon: string;
  description: string;
  colorName: 'emerald' | 'teal' | 'amber' | 'rose';
  badgeBg: string;
  barColor: string;
}

export const NOISE_LEVEL_STAGES: NoiseClassification[] = [
  {
    levelIndex: 0,
    label: 'Sehr leise',
    icon: '🤫',
    description: 'Flüstern oder Stille im Raum',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    barColor: 'bg-emerald-500',
  },
  {
    levelIndex: 1,
    label: 'Leise',
    icon: '🌿',
    description: 'Ruhige, konzentrierte Arbeitsatmosphäre',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    barColor: 'bg-emerald-500',
  },
  {
    levelIndex: 2,
    label: 'Angenehm',
    icon: '💬',
    description: 'Gute Gesprächs- & Gruppenlautstärke',
    colorName: 'teal',
    badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
    barColor: 'bg-teal-500',
  },
  {
    levelIndex: 3,
    label: 'Laut',
    icon: '📢',
    description: 'Erhöhter Geräuschpegel im Raum',
    colorName: 'amber',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    barColor: 'bg-amber-500',
  },
  {
    levelIndex: 4,
    label: 'Sehr laut',
    icon: '⚡',
    description: 'Starke Unruhe, Zeit für ein kurzes Signal',
    colorName: 'rose',
    badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    barColor: 'bg-rose-500',
  },
];

export interface NoiseMeterSettings {
  sensitivity: SensitivityLevel;
  threshold?: number; // Visuelle Zielmarke für Lehrkraft (Standard 65)
}

export const DEFAULT_NOISE_SETTINGS: NoiseMeterSettings = {
  sensitivity: 'normal',
  threshold: 65,
};

/**
 * Datenschutz- & Sicherheitsdeklaration:
 * Audiosignale werden niemals gespeichert, aufgezeichnet oder gesendet.
 */
export const NOISEMETER_DATA_POLICY = {
  storeAudio: false,
  recordAudio: false,
  transmitAudio: false,
  offlineOnly: true,
} as const;

/**
 * Wandelt die Empfindlichkeit in einen Multiplikator für die Pegelanalyse um
 */
export function getSensitivityMultiplier(sensitivity: SensitivityLevel): number {
  switch (sensitivity) {
    case 'low':
      return 0.7;
    case 'high':
      return 1.45;
    case 'normal':
    default:
      return 1.0;
  }
}

/**
 * Berechnet den Rohpegel (0..100) aus den FFT-Frequenzdaten eines Uint8Array
 */
export function calculateRawVolume(dataArray: Uint8Array, sensitivityMultiplier: number): number {
  if (!dataArray || dataArray.length === 0) return 0;

  // Ermittle Peak und RMS zur stabilen Frequenzerfassung
  let sum = 0;
  let max = 0;
  const len = dataArray.length;

  for (let i = 0; i < len; i++) {
    const val = dataArray[i];
    if (val > max) max = val;
    sum += val * val;
  }

  const rms = Math.sqrt(sum / len);
  // Kombinierter Messwert: 70% RMS + 30% Peak gegen einzelne kurze Klicks
  const combined = rms * 0.7 + max * 0.3;
  const normalized = (combined / 255) * 100 * sensitivityMultiplier;

  return Math.max(0, Math.min(100, Math.round(normalized)));
}

/**
 * Glättet den Messwert über einen exponentiell gleitenden Durchschnitt (EMA)
 */
export function computeSmoothedVolume(
  currentSmoothed: number,
  targetVolume: number,
  smoothingFactor = 0.35
): number {
  if (isNaN(currentSmoothed)) currentSmoothed = 0;
  if (isNaN(targetVolume)) targetVolume = 0;

  const validTarget = Math.max(0, Math.min(100, targetVolume));
  const smoothed = currentSmoothed + (validTarget - currentSmoothed) * smoothingFactor;

  return Math.max(0, Math.min(100, Math.round(smoothed * 10) / 10));
}

/**
 * Klassifiziert den geglätteten Pegel in 5 kindgerechte, neutrale Stufen
 */
export function classifyNoiseLevel(volume: number): NoiseClassification {
  const clamped = Math.max(0, Math.min(100, volume));

  if (clamped < 20) return NOISE_LEVEL_STAGES[0]; // Sehr leise
  if (clamped < 40) return NOISE_LEVEL_STAGES[1]; // Leise
  if (clamped < 65) return NOISE_LEVEL_STAGES[2]; // Angenehm
  if (clamped < 85) return NOISE_LEVEL_STAGES[3]; // Laut
  return NOISE_LEVEL_STAGES[4]; // Sehr laut
}

/**
 * Hilfsfunktion zum sauberen Beenden eines MediaStreams
 */
export function cleanupMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  } catch {}
}
