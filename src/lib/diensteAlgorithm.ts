/**
 * Reines, zustandsloses Logik- und Datenmodell für das Widget "Klassendienste" (widget-dienste)
 * 100 % offline, frei von KI, frei von Benotung/Tracking, vollständig deterministisch testbar.
 */

/** Calendar-based replacement date, independent of UTC midnight. */
export function localDienstDate(now: Date = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')].join('-');
}

export interface DiensteItem {
  id: string;
  titel: string;
  emoji: string;
  schuelerIds: string[];
  substitutions?: Record<string, string>; // originalStudentId -> substituteStudentId
  substitutionsDate?: string; // YYYY-MM-DD
}

export interface DiensteState {
  dienste: DiensteItem[];
  lastRotatedAt?: string;
  weekReference?: string;
}

/**
 * Standard-Dienste nach pädagogischer Vorgabe (Tafel, Austeilen, Pflanzen, Lüften, Ordnung, Müll, Bücher, Technik)
 */
export const DEFAULT_DIENSTE_PRESETS: Array<{ titel: string; emoji: string }> = [
  { titel: "Tafel", emoji: "🧽" },
  { titel: "Austeilen", emoji: "🥛" },
  { titel: "Pflanzen", emoji: "🌱" },
  { titel: "Lüften", emoji: "🌬️" },
  { titel: "Ordnung", emoji: "🧺" },
  { titel: "Müll", emoji: "🗑️" },
  { titel: "Bücher", emoji: "📚" },
  { titel: "Technik", emoji: "💻" },
];

/**
 * Emoji-Auswahlpalette für benutzerdefinierte Klassendienste
 */
export const DIENSTE_EMOJI_PALETTE = [
  "🧽", "🧹", "🥛", "🌱", "🌬️", "🧺", "🗑️", "📚", "💻", "📦", "💡", "🚪", "🍎", "🐾", "📖", "✨"
];

/**
 * Erzeugt eine Standardliste an Klassendiensten mit eindeutigen IDs
 */
export function initializeDefaultDienste(
  presets = DEFAULT_DIENSTE_PRESETS
): DiensteItem[] {
  return presets.map((p, idx) => ({
    id: `dienst-default-${idx + 1}`,
    titel: p.titel,
    emoji: p.emoji,
    schuelerIds: [],
    substitutions: {},
  }));
}

/**
 * Migriert bestehende Daten (z. B. aus app.dienste oder Legacy-Formaten)
 */
export function migrateLegacyDienste(existingDienste?: any[]): DiensteItem[] {
  if (!Array.isArray(existingDienste) || existingDienste.length === 0) {
    return initializeDefaultDienste();
  }

  return existingDienste.map((item, idx) => {
    const rawId = item.id || `dienst-gen-${idx + 1}`;
    const rawTitle = (item.titel || item.title || `Dienst ${idx + 1}`).trim();
    const rawEmoji = item.emoji || (typeof item.icon === 'string' && item.icon.length <= 4 ? item.icon : "📋");
    const rawIds: string[] = Array.isArray(item.schuelerIds)
      ? Array.from(new Set(item.schuelerIds.filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)))
      : [];

    const substitutions: Record<string, string> = {};
    if (item.substitutions && typeof item.substitutions === 'object') {
      for (const [k, v] of Object.entries(item.substitutions)) {
        if (typeof k === 'string' && typeof v === 'string') {
          substitutions[k] = v;
        }
      }
    }

    return {
      id: String(rawId),
      titel: rawTitle,
      emoji: rawEmoji,
      schuelerIds: rawIds,
      substitutions,
      substitutionsDate: item.substitutionsDate || undefined,
    };
  });
}

/**
 * Dienst hinzufügen
 */
export function addDienst(
  dienste: DiensteItem[],
  titel: string,
  emoji = "📋"
): DiensteItem[] {
  const cleanTitle = titel.trim();
  if (!cleanTitle) return dienste;

  const newItem: DiensteItem = {
    id: `dienst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    titel: cleanTitle,
    emoji: emoji || "📋",
    schuelerIds: [],
    substitutions: {},
  };

  return [...dienste, newItem];
}

/**
 * Dienst umbenennen oder Emoji ändern
 */
export function editDienst(
  dienste: DiensteItem[],
  dienstId: string,
  updates: { titel?: string; emoji?: string }
): DiensteItem[] {
  return dienste.map((item) => {
    if (item.id !== dienstId) return item;
    return {
      ...item,
      titel: updates.titel !== undefined ? updates.titel.trim() : item.titel,
      emoji: updates.emoji !== undefined ? updates.emoji : item.emoji,
    };
  });
}

/**
 * Dienst löschen
 */
export function deleteDienst(
  dienste: DiensteItem[],
  dienstId: string
): DiensteItem[] {
  return dienste.filter((item) => item.id !== dienstId);
}

/**
 * Schüler einem Dienst zuordnen
 */
export function assignStudentToDienst(
  dienste: DiensteItem[],
  dienstId: string,
  studentId: string
): DiensteItem[] {
  if (!studentId) return dienste;
  return dienste.map((item) => {
    if (item.id !== dienstId) return item;
    if (item.schuelerIds.includes(studentId)) return item;
    return {
      ...item,
      schuelerIds: [...item.schuelerIds, studentId],
    };
  });
}

/**
 * Schüler von einem Dienst entfernen (und eventuelle Vertretungen für ihn auflösen)
 */
export function removeStudentFromDienst(
  dienste: DiensteItem[],
  dienstId: string,
  studentId: string
): DiensteItem[] {
  return dienste.map((item) => {
    if (item.id !== dienstId) return item;
    const remainingIds = item.schuelerIds.filter((id) => id !== studentId);
    const updatedSubstitutions = { ...(item.substitutions || {}) };
    delete updatedSubstitutions[studentId];

    return {
      ...item,
      schuelerIds: remainingIds,
      substitutions: updatedSubstitutions,
    };
  });
}

/**
 * Schüler-Zuordnung umschalten
 */
export function toggleStudentInDienst(
  dienste: DiensteItem[],
  dienstId: string,
  studentId: string
): DiensteItem[] {
  const target = dienste.find((d) => d.id === dienstId);
  if (!target) return dienste;
  if (target.schuelerIds.includes(studentId)) {
    return removeStudentFromDienst(dienste, dienstId, studentId);
  }
  return assignStudentToDienst(dienste, dienstId, studentId);
}

/**
 * Temporäre Vertretung für heute festlegen
 */
export function setTemporarySubstitution(
  dienste: DiensteItem[],
  dienstId: string,
  originalStudentId: string,
  substituteStudentId: string,
  dateStr = localDienstDate()
): DiensteItem[] {
  return dienste.map((item) => {
    if (item.id !== dienstId) return item;
    return {
      ...item,
      substitutions: {
        ...(item.substitutionsDate === dateStr ? (item.substitutions || {}) : {}),
        [originalStudentId]: substituteStudentId,
      },
      substitutionsDate: dateStr,
    };
  });
}

/**
 * Temporäre Vertretung entfernen
 */
export function removeTemporarySubstitution(
  dienste: DiensteItem[],
  dienstId: string,
  originalStudentId: string
): DiensteItem[] {
  return dienste.map((item) => {
    if (item.id !== dienstId) return item;
    const updatedSubstitutions = { ...(item.substitutions || {}) };
    delete updatedSubstitutions[originalStudentId];
    return {
      ...item,
      substitutions: updatedSubstitutions,
    };
  });
}

/**
 * Zyklische Rotation ("Weiterdrehen") der Schülereinteilung über alle Dienste
 * Schiebt die Zuweisungslisten um 1 Position weiter: d[0] -> d[1] -> ... -> d[N] -> d[0]
 * Behält die Vertretungszuordnungen für die jeweiligen Schüler mit umgezogen bei.
 */
export function rotateDienste(dienste: DiensteItem[]): DiensteItem[] {
  if (dienste.length <= 1) return dienste;

  // Sammle die schuelerIds und dazugehörigen Vertretungs-Maps je Dienst
  const dutyAssignments = dienste.map((d) => ({
    ids: [...d.schuelerIds],
    substitutions: { ...(d.substitutions || {}) },
    substitutionsDate: d.substitutionsDate,
  }));

  // [last, 0, 1, ..., N-2]
  const last = dutyAssignments[dutyAssignments.length - 1];
  const rest = dutyAssignments.slice(0, dutyAssignments.length - 1);
  const rotated = [last, ...rest];

  return dienste.map((d, idx) => ({
    ...d,
    schuelerIds: rotated[idx].ids,
    substitutions: rotated[idx].substitutions,
    substitutionsDate: rotated[idx].substitutionsDate,
  }));
}

/**
 * Zufällige, gleichmäßige Neuverteilung (Shuffle) verfügbarer Schüler auf die Dienste
 */
export function shuffleDienste(
  dienste: DiensteItem[],
  availableStudentIds: string[],
  studentsPerDuty = 1
): DiensteItem[] {
  if (dienste.length === 0 || availableStudentIds.length === 0) return dienste;

  // Kopie der IDs mischen (Fisher-Yates)
  const pool = [...availableStudentIds];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  let poolIdx = 0;
  return dienste.map((d) => {
    const assigned: string[] = [];
    for (let c = 0; c < studentsPerDuty && poolIdx < pool.length; c++) {
      assigned.push(pool[poolIdx++]);
    }
    return {
      ...d,
      schuelerIds: assigned,
      substitutions: {},
    };
  });
}

/**
 * Alle Zuweisungen auf einmal leeren
 */
export function clearAllAssignments(dienste: DiensteItem[]): DiensteItem[] {
  return dienste.map((d) => ({
    ...d,
    schuelerIds: [],
    substitutions: {},
  }));
}

/**
 * Berechnet für einen Dienst die effektiven Schülereinträge inklusive Abwesenheits- & Vertretungsstatus
 */
export interface EffectiveAssignee {
  originalStudentId: string;
  isAbsent: boolean;
  substituteStudentId?: string;
  effectiveStudentId: string;
}

export function getEffectiveDienstAssignees(
  dienst: DiensteItem,
  isAbsentFn: (studentId: string) => boolean,
  today = localDienstDate(),
): EffectiveAssignee[] {
  // Legacy lists without a date retain their previous behaviour; dated daily
  // substitutions are automatically ignored on following calendar days.
  const substitutions = !dienst.substitutionsDate || dienst.substitutionsDate === today
    ? (dienst.substitutions || {}) : {};

  return dienst.schuelerIds.map((origId) => {
    const isAbsent = isAbsentFn(origId);
    const subId = substitutions[origId];
    return {
      originalStudentId: origId,
      isAbsent,
      substituteStudentId: subId,
      effectiveStudentId: isAbsent && subId ? subId : origId,
    };
  });
}

/**
 * Responsive-Kategorie-Ermittlung
 */
export type DiensteResponsiveCategory = 'compact' | 'standard' | 'large' | 'fullscreen';

export function getDiensteResponsiveCategory(
  width: number,
  isFullscreen = false
): DiensteResponsiveCategory {
  if (isFullscreen || width >= 800) return 'fullscreen';
  if (width >= 550) return 'large';
  if (width >= 380) return 'standard';
  return 'compact';
}

/**
 * Validiert, dass keine Noten, Sterne oder Verhaltensbewertungen enthalten sind
 */
export function hasNoGradingOrBehaviorData(dienste: DiensteItem[]): boolean {
  return dienste.every((d) => {
    const asAny = d as any;
    return (
      asAny.note === undefined &&
      asAny.sterne === undefined &&
      asAny.points === undefined &&
      asAny.strafe === undefined &&
      asAny.behaviorScore === undefined &&
      asAny.punkte === undefined
    );
  });
}
