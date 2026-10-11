export type MusicStudioMode = 'signals' | 'piano' | 'rhythm' | 'tonetrainer' | 'ambient';

export const MUSIC_STUDIO_MODES: ReadonlyArray<{ id: MusicStudioMode; label: string; description: string }> = [
  { id: 'signals', label: '🔔 Signale', description: 'Klare Unterrichtssignale' },
  { id: 'piano', label: '🎹 Klavier', description: 'Töne und Tonleiter spielen' },
  { id: 'rhythm', label: '🥁 Rhythmus', description: 'Takt und Klatschmuster' },
  { id: 'tonetrainer', label: '🎼 Ton-Trainer', description: 'Melodien und Hören üben' },
  { id: 'ambient', label: '🌧️ Naturklänge', description: 'Ruhige Klänge für die Arbeitsphase' },
];

export function normalizeMusicStudioMode(input: unknown): MusicStudioMode {
  return MUSIC_STUDIO_MODES.find(mode => mode.id === input)?.id || 'signals';
}

/** Preserve unrelated lesson state while a shared music-studio preference changes. */
export function mergeMusicStudioSettings(
  current: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(current || {}), ...updates };
}
