/**
 * Beschlossene Auswahl für den NEUEN regulären Unterrichts-Cockpit-Katalog.
 *
 * Noch nicht als Widget-Picker aktivieren: Bei Alias-Quellen ist zuerst die
 * fachliche Zusammenführung (inklusive vorhandener settings/Layout-Daten)
 * zu implementieren und mit alten Backups zu prüfen. Diese Datei führt
 * ausdrücklich KEINE automatische Datenmigration aus. Alte Widgets bleiben
 * bis dahin durch den bisherigen Layout-Renderer lesbar.
 *
 * Dashboard-Widgets und globale Einstellungen gehören nicht in diesen Katalog.
 */
export interface PlannedCockpitWidget {
  id: string;
  label: string;
  /** Bestands-Typen mit zu prüfenden Funktionen oder gespeicherten Daten. */
  sources: readonly string[];
}

export const PLANNED_COCKPIT_WIDGETS = [
  {
    "id": "kidattendance",
    "label": "Ich bin da!",
    "sources": [
      "kidattendance"
    ]
  },
  {
    "id": "studentlist",
    "label": "Schülerliste & Mitarbeit",
    "sources": [
      "studentlist"
    ]
  },
  {
    "id": "groups",
    "label": "Gruppen bilden",
    "sources": [
      "groups"
    ]
  },
  {
    "id": "randomname",
    "label": "Zufallsauswahl",
    "sources": [
      "randomname",
      "wheel",
      "faircall"
    ]
  },
  {
    "id": "timer",
    "label": "Zeit",
    "sources": [
      "timer",
      "stopwatch",
      "clock"
    ]
  },
  {
    "id": "timeline",
    "label": "Tagesablauf",
    "sources": [
      "timeline",
      "phases"
    ]
  },
  {
    "id": "instruction",
    "label": "Arbeitsauftrag",
    "sources": [
      "instruction",
      "todo"
    ]
  },
  {
    "id": "dienste",
    "label": "Klassendienste",
    "sources": [
      "dienste"
    ]
  },
  {
    "id": "trafficlight",
    "label": "Lautstärke & Arbeitsampel",
    "sources": [
      "trafficlight",
      "noisemeter",
      "noisescales"
    ]
  },
  {
    "id": "klassenglas",
    "label": "Klassenziel",
    "sources": [
      "klassenglas",
      "classtarget",
      "thermometer"
    ]
  },
  {
    "id": "dice",
    "label": "Würfel",
    "sources": [
      "dice"
    ]
  },
  {
    "id": "image",
    "label": "Bild & Material",
    "sources": [
      "image"
    ]
  },
  {
    "id": "qrcode",
    "label": "QR-Code & Link",
    "sources": [
      "qrcode",
      "links"
    ]
  },
  {
    "id": "vocabulary",
    "label": "Lernwörter",
    "sources": [
      "vocabulary"
    ]
  },
  {
    "id": "wortsatzwerkstatt",
    "label": "Wörter & Sätze",
    "sources": [
      "wortsatzwerkstatt",
      "scrambler",
      "wordscramble",
      "sentencebuilding",
      "wordbuilder",
      "compoundsplit",
      "abcorder"
    ]
  },
  {
    "id": "riddle",
    "label": "Quiz & Rätsel",
    "sources": [
      "riddle",
      "aiquiz"
    ]
  },
  {
    "id": "zahlenraum",
    "label": "Zahlenraum",
    "sources": [
      "zahlenraum",
      "anschauung",
      "numberline"
    ]
  },
  {
    "id": "kopfrechnen",
    "label": "Kopfrechnen",
    "sources": [
      "kopfrechnen",
      "multitrainer",
      "mathchain"
    ]
  },
  {
    "id": "fractionvisualizer",
    "label": "Brüche",
    "sources": [
      "fractionvisualizer",
      "fractions",
      "fractioncake",
      "fractiongrid"
    ]
  },
  {
    "id": "sounds",
    "label": "Musik & Klänge",
    "sources": [
      "sounds",
      "soundmachine",
      "piano",
      "rhythm",
      "tonetrainer"
    ]
  }
] as const satisfies readonly PlannedCockpitWidget[];

export type PlannedCockpitWidgetId = (typeof PLANNED_COCKPIT_WIDGETS)[number]['id'];

export function getPlannedCockpitWidgetForLegacyType(
  legacyType: string,
): PlannedCockpitWidgetId | null {
  for (const widget of PLANNED_COCKPIT_WIDGETS) {
    if ((widget.sources as readonly string[]).includes(legacyType)) return widget.id;
  }
  // Nicht ausgewählt heißt NICHT löschen: weiter als altes Widget erhalten,
  // bis ein verlustfreier, reversibler Migrationspfad nachgewiesen wurde.
  return null;
}
