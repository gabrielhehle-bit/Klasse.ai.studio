/**
 * trafficlightAlgorithm.ts
 * F-UI Standard-konforme Logik für das Arbeitsmodus- & Status-Ampel Widget (F12).
 * Arbeitsmodus / Sozialform / Konzentrationsmodus – KEINE Verhaltensbewertung!
 * 100% offline, deterministisch, ohne KI oder externe Netzwerkaufrufe.
 */

export type TrafficLightModeId = 'zuhören' | 'leise' | 'austausch' | 'pause';

export interface TrafficLightMode {
  id: TrafficLightModeId;
  label: string;
  shortLabel: string;
  description: string;
  colorName: 'rose' | 'amber' | 'emerald' | 'blue';
  icon: string;
}

export const TRAFFIC_LIGHT_MODES: TrafficLightMode[] = [
  {
    id: 'zuhören',
    label: 'Stopp & Zuhören',
    shortLabel: 'Zuhören',
    description: 'Alle Augen nach vorne, Stifte weg',
    colorName: 'rose',
    icon: '✋',
  },
  {
    id: 'leise',
    label: 'Leise arbeiten',
    shortLabel: 'Leise',
    description: 'Einzelarbeit & Ruhe im Raum',
    colorName: 'amber',
    icon: '🤫',
  },
  {
    id: 'austausch',
    label: 'Partner- & Gruppenarbeit',
    shortLabel: 'Austausch',
    description: 'Im Flüster- und Austauschton sprechen',
    colorName: 'emerald',
    icon: '👥',
  },
  {
    id: 'pause',
    label: 'Pause & Frei',
    shortLabel: 'Pause',
    description: 'Durchatmen und entspannen',
    colorName: 'blue',
    icon: '☕',
  },
];

export interface TrafficLightSettings {
  activeModeId: TrafficLightModeId;
  customLabels?: Partial<Record<TrafficLightModeId, string>>;
}

export const DEFAULT_TRAFFIC_LIGHT_SETTINGS: TrafficLightSettings = {
  activeModeId: 'leise',
  customLabels: {},
};

export function getTrafficLightMode(id: string): TrafficLightMode {
  const mode = TRAFFIC_LIGHT_MODES.find((m) => m.id === id);
  return mode || TRAFFIC_LIGHT_MODES[1]; // Fallback auf 'leise'
}

/**
 * Wandelt alte legacy Ampelstatus ('rot' | 'gelb' | 'gruen') sauber in F12 Modi um
 */
export function migrateLegacyAmpelStatus(legacyStatus?: string): TrafficLightModeId {
  if (legacyStatus === 'rot') return 'zuhören';
  if (legacyStatus === 'gelb') return 'leise';
  if (legacyStatus === 'gruen') return 'austausch';
  if (legacyStatus === 'pause') return 'pause';
  if (legacyStatus === 'zuhören' || legacyStatus === 'leise' || legacyStatus === 'austausch') {
    return legacyStatus as TrafficLightModeId;
  }
  return 'leise';
}

/**
 * Prüft ob die Ampel neutrale Arbeitsmodi darstellt und keine Verhaltensstrafen enthält
 */
export function validateNeutrality(modeId: TrafficLightModeId): boolean {
  const validIds: TrafficLightModeId[] = ['zuhören', 'leise', 'austausch', 'pause'];
  return validIds.includes(modeId);
}
