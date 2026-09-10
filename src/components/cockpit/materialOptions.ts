// Gemeinsame Materialdefinitionen für Lehrercockpit (F3 Arbeitsanweisung & F4 Tisch-Check)

export interface MaterialOption {
  id: string;
  label: string;
  icon: string;
  category?: 'standard' | 'extra';
}

export const STANDARD_MATERIALS: MaterialOption[] = [
  // Wichtigste Standard-Materialien für den täglichen Unterricht
  { id: 'book', label: 'Buch', icon: '📖', category: 'standard' },
  { id: 'exercise_book', label: 'Heft', icon: '📓', category: 'standard' },
  { id: 'worksheet', label: 'Arbeitsblatt', icon: '📄', category: 'standard' },
  { id: 'fountain_pen', label: 'Füller', icon: '✒️', category: 'standard' },
  { id: 'pencil', label: 'Bleistift', icon: '✏️', category: 'standard' },
  { id: 'eraser', label: 'Radiergummi', icon: '🧼', category: 'standard' },
  { id: 'ruler', label: 'Lineal', icon: '📏', category: 'standard' },
  { id: 'triangle', label: 'Geodreieck', icon: '📐', category: 'standard' },
  { id: 'scissors', label: 'Schere', icon: '✂️', category: 'standard' },
  { id: 'glue', label: 'Kleber', icon: '🧴', category: 'standard' },
  { id: 'colored_pencils', label: 'Farbstifte', icon: '🖍️', category: 'standard' },
  { id: 'felt_pens', label: 'Filzstifte', icon: '🖌️', category: 'standard' },
  { id: 'tablet', label: 'Tablet', icon: '💻', category: 'standard' },
  { id: 'headphones', label: 'Kopfhörer', icon: '🎧', category: 'standard' },
  { id: 'pencil_case', label: 'Mäppchen', icon: '👝', category: 'standard' },

  // Ergänzende Schulmaterialien ("Mehr")
  { id: 'homework_book', label: 'Hausaufgabenheft', icon: '📔', category: 'extra' },
  { id: 'drawing_pad', label: 'Zeichenblock', icon: '📋', category: 'extra' },
  { id: 'watercolors', label: 'Wasserfarben', icon: '🎨', category: 'extra' },
  { id: 'snack', label: 'Jause / Frühstück', icon: '🥪', category: 'extra' },
  { id: 'water_bottle', label: 'Trinkflasche', icon: '🥤', category: 'extra' },
  { id: 'sports_bag', label: 'Turnsackerl', icon: '👟', category: 'extra' },
];

// Mapping für Abwärtskompatibilität bestehender Board-Settings
export const LEGACY_MATERIAL_MAPPING: Record<string, { label: string; icon: string }> = {
  'math-book': { label: 'Mathebuch', icon: '📘' },
  'read-book': { label: 'Lesebuch', icon: '📙' },
  'notebook': { label: 'Schreibheft', icon: '📓' },
  'pen': { label: 'Füller', icon: '✒️' },
  'colors': { label: 'Farbstifte', icon: '🖍️' },
  'lunch': { label: 'Jause / Frühstück', icon: '🥪' },
  'bottle': { label: 'Trinkflasche', icon: '🥤' },
  'homework': { label: 'Hausaufgabenheft', icon: '📔' },
};

/**
 * Löst eine Material-ID (neu oder legacy) in ein einheitliches Anzeigeverhalten auf.
 */
export function resolveMaterialItem(
  id: string,
  customItems: Array<{ id: string; name?: string; label?: string; emoji?: string; icon?: string }> = []
): { id: string; label: string; icon: string } {
  // 1. In Standard-Materialien suchen
  const standard = STANDARD_MATERIALS.find((m) => m.id === id);
  if (standard) return { id: standard.id, label: standard.label, icon: standard.icon };

  // 2. In Custom-Items suchen
  const custom = customItems.find((c) => c.id === id);
  if (custom) {
    return {
      id: custom.id,
      label: custom.name || custom.label || 'Gegenstand',
      icon: custom.emoji || custom.icon || '🎒',
    };
  }

  // 3. In Legacy-Mapping suchen
  const legacy = LEGACY_MATERIAL_MAPPING[id];
  if (legacy) return { id, label: legacy.label, icon: legacy.icon };

  // 4. Fallback
  return { id, label: id, icon: '🎒' };
}
