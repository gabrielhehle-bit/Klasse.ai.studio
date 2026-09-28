export type PianoLabelMode = 'solfege' | 'letters' | 'both';

export interface PianoWidgetSettings {
  labelMode: PianoLabelMode;
  showColors: boolean;
  volume: number;
}

export interface PianoKeyDefinition {
  note: string;
  solfege: string;
  shortcut: string;
  frequency: number;
  toneClass: string;
}

export const PIANO_KEYS: readonly PianoKeyDefinition[] = [
  { note: 'C4', solfege: 'Do', shortcut: '1', frequency: 261.63, toneClass: 'bg-red-500' },
  { note: 'D4', solfege: 'Re', shortcut: '2', frequency: 293.66, toneClass: 'bg-orange-500' },
  { note: 'E4', solfege: 'Mi', shortcut: '3', frequency: 329.63, toneClass: 'bg-yellow-500' },
  { note: 'F4', solfege: 'Fa', shortcut: '4', frequency: 349.23, toneClass: 'bg-green-500' },
  { note: 'G4', solfege: 'Sol', shortcut: '5', frequency: 392.0, toneClass: 'bg-sky-500' },
  { note: 'A4', solfege: 'La', shortcut: '6', frequency: 440.0, toneClass: 'bg-blue-500' },
  { note: 'B4', solfege: 'Si', shortcut: '7', frequency: 493.88, toneClass: 'bg-violet-500' },
  { note: 'C5', solfege: 'Do', shortcut: '8', frequency: 523.25, toneClass: 'bg-rose-500' },
] as const;

export const DEFAULT_PIANO_WIDGET_SETTINGS: PianoWidgetSettings = {
  labelMode: 'both',
  showColors: true,
  volume: 0.55,
};

export function normalizePianoWidgetSettings(raw: unknown): PianoWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const labelMode: PianoLabelMode =
    value.labelMode === 'solfege' || value.labelMode === 'letters' || value.labelMode === 'both'
      ? value.labelMode
      : DEFAULT_PIANO_WIDGET_SETTINGS.labelMode;
  const volume =
    typeof value.volume === 'number' && Number.isFinite(value.volume)
      ? Math.max(0.15, Math.min(0.9, value.volume))
      : DEFAULT_PIANO_WIDGET_SETTINGS.volume;
  return {
    labelMode,
    showColors: typeof value.showColors === 'boolean' ? value.showColors : DEFAULT_PIANO_WIDGET_SETTINGS.showColors,
    volume,
  };
}

export function getPianoKeyPrimaryLabel(key: PianoKeyDefinition, mode: PianoLabelMode): string {
  if (mode === 'letters') return key.note.replace(/\d+$/, '');
  return key.solfege;
}

export function getPianoKeySecondaryLabel(key: PianoKeyDefinition, mode: PianoLabelMode): string | null {
  if (mode === 'both') return key.note;
  return null;
}
