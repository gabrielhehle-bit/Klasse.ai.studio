import {
  getPlannedCockpitWidgetForLegacyType,
  PLANNED_COCKPIT_WIDGETS,
  PlannedCockpitWidgetId,
} from "../components/cockpit/plannedCockpitCatalog";

export interface CockpitWidgetCanonicalEntry {
  canonicalId: string;
  displayName: string;
  category: string;
  description: string;
  aliasOf?: string;
}

type CanonicalMetadata = Omit<CockpitWidgetCanonicalEntry, "canonicalId" | "aliasOf">;

const CANONICAL_METADATA: Record<PlannedCockpitWidgetId, CanonicalMetadata> = {
  kidattendance: {
    displayName: "Ich bin da!",
    category: "classroom",
    description: "Kinder melden sich für den Unterricht an.",
  },
  groups: {
    displayName: "Gruppen bilden",
    category: "classroom",
    description: "Die Klasse schnell und fair in Gruppen einteilen.",
  },
  classweeklyplan: {
    displayName: "Wochenplan der Kinder",
    category: "classroom",
    description: "Gemeinsame Aufgaben und Termine der Woche.",
  },
  randomname: {
    displayName: "Zufallsauswahl",
    category: "classroom",
    description: "Ein Kind oder eine Reihenfolge fair auswählen.",
  },
  timer: {
    displayName: "Zeit",
    category: "classroom",
    description: "Timer, Stoppuhr und sichtbare Zeitvorgaben.",
  },
  timeline: {
    displayName: "Tagesablauf",
    category: "classroom",
    description: "Phasen und Ablauf des Unterrichtstages.",
  },
  instruction: {
    displayName: "Arbeitsauftrag",
    category: "classroom",
    description: "Aufträge, Hinweise und nächste Schritte anzeigen.",
  },
  dienste: {
    displayName: "Klassendienste",
    category: "classroom",
    description: "Dienste der Klasse sichtbar verteilen.",
  },
  trafficlight: {
    displayName: "Lautstärke & Arbeitsampel",
    category: "classroom",
    description: "Arbeitsruhe und Lautstärke gemeinsam steuern.",
  },
  klassenglas: {
    displayName: "Klassenziel",
    category: "classroom",
    description: "Ein gemeinsames Ziel mit sichtbarem Fortschritt.",
  },
  dice: {
    displayName: "Würfel",
    category: "classroom",
    description: "Zufallszahlen für Spiele und Aufgaben.",
  },
  image: {
    displayName: "Bild & Material",
    category: "classroom",
    description: "Bild- und Unterrichtsmaterial im Cockpit öffnen.",
  },
  qrcode: {
    displayName: "QR-Code & Link",
    category: "classroom",
    description: "Links für die Klasse sichtbar teilen.",
  },
  vocabulary: {
    displayName: "Lernwörter",
    category: "language",
    description: "Lernwörter und Schreibvarianten üben.",
  },
  wortsatzwerkstatt: {
    displayName: "Wörter & Sätze",
    category: "language",
    description: "Wörter ordnen, bauen und zu Sätzen verbinden.",
  },
  riddle: {
    displayName: "Quiz & Rätsel",
    category: "language",
    description: "Rätseln, fragen und gemeinsam lösen.",
  },
  zahlenraum: {
    displayName: "Zahlenraum",
    category: "math",
    description: "Zahlen, Mengen und Zahlengerade erkunden.",
  },
  kopfrechnen: {
    displayName: "Kopfrechnen",
    category: "math",
    description: "Rechenaufgaben im passenden Zahlenraum trainieren.",
  },
  fractionvisualizer: {
    displayName: "Brüche",
    category: "math",
    description: "Brüche sichtbar legen und vergleichen.",
  },
  sounds: {
    displayName: "Musik & Klänge",
    category: "media",
    description: "Sounds, Rhythmus und Musik im Unterricht nutzen.",
  },
};

const EXTRA_CANONICAL_ALIASES: Record<string, PlannedCockpitWidgetId> = {
  lernwoerter: "vocabulary",
  lernwoerterstudio: "vocabulary",
  spellingdetective: "vocabulary",
};

export const resolveCockpitWidgetCanonicalId = (
  type: string,
): PlannedCockpitWidgetId | null => {
  return (
    getPlannedCockpitWidgetForLegacyType(type) ??
    EXTRA_CANONICAL_ALIASES[type] ??
    null
  );
};

export function getCockpitWidgetCanonicalEntry(
  type: string,
): CockpitWidgetCanonicalEntry | undefined {
  const canonicalId = resolveCockpitWidgetCanonicalId(type);
  if (!canonicalId) return undefined;

  const metadata = CANONICAL_METADATA[canonicalId];
  return {
    canonicalId,
    ...metadata,
    ...(canonicalId === type ? {} : { aliasOf: canonicalId }),
  };
}

export function getCockpitWidgetCanonicalCatalog(): readonly CockpitWidgetCanonicalEntry[] {
  return PLANNED_COCKPIT_WIDGETS.map((widget) => ({
    canonicalId: widget.id,
    ...CANONICAL_METADATA[widget.id],
  }));
}

export function summarizeCockpitWidgetTypes(types: readonly string[]): {
  canonicalTypeCount: number;
  entryCount: number;
  aliasCount: number;
} {
  const canonicalIds = types
    .map(resolveCockpitWidgetCanonicalId)
    .filter((id): id is PlannedCockpitWidgetId => Boolean(id));

  return {
    canonicalTypeCount: new Set(canonicalIds).size,
    entryCount: types.length,
    aliasCount: types.length - new Set(canonicalIds).size,
  };
}
