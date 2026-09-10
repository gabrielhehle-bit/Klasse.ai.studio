/**
 * Lernwörter-Studio Algorithmus & Datenstrukturen
 * F26.1 Konsolidierung von vocabulary, spellingdetective und abcorder
 * 100% offline, deterministisch, ohne KI, ohne externe Netzwerkrequests.
 */

export type LernwoerterMode = 'cards' | 'spelling' | 'alphabet';

export type StolperstelleCategory =
  | 'doppelkonsonant'
  | 'dehnung'
  | 'ie'
  | 'ck'
  | 'tz'
  | 'sz'
  | 'st_sp'
  | 'gross'
  | 'custom';

export interface StolperstelleRuleMeta {
  id: StolperstelleCategory;
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
}

export const STOLPERSTELLEN_RULES: StolperstelleRuleMeta[] = [
  {
    id: 'doppelkonsonant',
    label: 'Doppelkonsonant (ll, mm, nn, tt, ss...)',
    shortLabel: 'Doppel-Konsonant',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700',
    description: 'Zwei gleiche Konsonanten nach kurzem Vokal',
  },
  {
    id: 'dehnung',
    label: 'Dehnung (h / Dehnungs-h / Doppel-Vokal)',
    shortLabel: 'Dehnungs-h',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-700',
    description: 'Stummes h zur Dehnung des Vokals',
  },
  {
    id: 'ie',
    label: 'Langes ie',
    shortLabel: 'Langes ie',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700',
    description: 'Langer i-Laut als ie geschrieben',
  },
  {
    id: 'ck',
    label: 'K-Laut als ck',
    shortLabel: 'ck',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700',
    description: 'Nach kurzem Vokal steht ck statt k',
  },
  {
    id: 'tz',
    label: 'Z-Laut als tz',
    shortLabel: 'tz',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-700',
    description: 'Nach kurzem Vokal steht tz statt z',
  },
  {
    id: 'sz',
    label: 'Scharfes ß',
    shortLabel: 'Scharfes ß',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700',
    description: 'Scharfer s-Laut nach langem Vokal oder Zwielaut',
  },
  {
    id: 'st_sp',
    label: 'Sp / St am Wortanfang',
    shortLabel: 'Sp / St',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700',
    description: 'Wird als schp / scht gesprochen, aber Sp/St geschrieben',
  },
  {
    id: 'gross',
    label: 'Großschreibung (Nomen / Signalwort)',
    shortLabel: 'Großschreibung',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-700',
    description: 'Nomen und Satzanfänge werden großgeschrieben',
  },
  {
    id: 'custom',
    label: 'Eigene Merkstelle',
    shortLabel: 'Merkstelle',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700',
    description: 'Individuelle Rechtschreibstelle',
  },
];

export interface WordHighlight {
  id: string;
  startIndex: number; // 0-based inclusive
  endIndex: number;   // 0-based exclusive
  chars: string;
  category: StolperstelleCategory;
  note?: string;
}

export interface LernwortItem {
  id: string;
  text: string;
  highlights: WordHighlight[];
}

export interface LernwoerterStudioState {
  mode: LernwoerterMode;
  words: LernwortItem[];
  currentIndex: number;
  isCovered: boolean;
  isShuffle: boolean;
  shuffleOrder: number[]; // Permutation indices if shuffle active
  abcOrder: string[];     // Array of word IDs in current manual ABC order
  presentationMode: boolean;
}

export const DEFAULT_LERNWOERTER: string[] = [
  'Apfel',
  'Blitz',
  'Boot',
  'Fahrrad',
  'Hund',
  'Katze',
  'Regen',
  'Schule',
  'Sonne',
  'Straße',
  'Wasser',
];

export function createInitialLernwortItem(text: string, idPrefix?: string): LernwortItem {
  const clean = text.trim();
  const id = idPrefix ? `${idPrefix}-${clean}` : `lw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    text: clean,
    highlights: [],
  };
}

export function getInitialLernwoerterStudioState(
  initialWords?: string[],
  defaultMode: LernwoerterMode = 'cards'
): LernwoerterStudioState {
  const wordList = initialWords && initialWords.length > 0 ? initialWords : DEFAULT_LERNWOERTER;
  const items = wordList.map((w, idx) => createInitialLernwortItem(w, `init-${idx}`));
  return {
    mode: defaultMode,
    words: items,
    currentIndex: 0,
    isCovered: false,
    isShuffle: false,
    shuffleOrder: [],
    abcOrder: items.map((w) => w.id),
    presentationMode: false,
  };
}

/**
 * Normalisiert ein Wort (trimmt Leerzeichen, behält Bindestriche/Trennzeichen bei)
 */
export function sanitizeWord(word: string): string {
  if (!word) return '';
  return word.trim();
}

/**
 * Bereinigt Silbentrennzeichen (- · •) für Vergleiche und Vorlesen
 */
export function cleanWordText(word: string): string {
  if (!word) return '';
  return word.replace(/[-·•]/g, '').trim();
}

/**
 * Ermittelt Silben eines Wortes anhand von Trennzeichen (- · •)
 */
export function getWordSyllables(wordText: string): string[] {
  if (!wordText) return [];
  if (/[-·•]/.test(wordText)) {
    const parts = wordText.split(/[-·•]+/).filter((s) => s.length > 0);
    if (parts.length > 0) return parts;
  }
  return [wordText];
}

/**
 * Import-Parser: Ein Wort pro Zeile oder Komma-getrennt
 * Filtert Leerzeilen und erkennt Dubletten (case-insensitive)
 * Behält Bindestriche und Trennzeichen für Silbendarstellung bei
 */
export function parseWordList(rawText: string): { words: string[]; duplicates: string[] } {
  if (!rawText) return { words: [], duplicates: [] };
  const tokens = rawText
    .split(/[\n,;]+/)
    .map((w) => sanitizeWord(w))
    .filter((w) => w.length > 0);

  const seen = new Set<string>();
  const words: string[] = [];
  const duplicates: string[] = [];

  for (const token of tokens) {
    const key = cleanWordText(token).toLowerCase();
    if (seen.has(key)) {
      if (!duplicates.includes(token)) {
        duplicates.push(token);
      }
    } else {
      seen.add(key);
      words.push(token);
    }
  }

  return { words, duplicates };
}

/**
 * Wort hinzufügen mit Dublettenprüfung
 */
export function addWord(
  state: LernwoerterStudioState,
  newWordText: string
): { state: LernwoerterStudioState; added: boolean; isDuplicate: boolean } {
  const clean = sanitizeWord(newWordText);
  if (!clean) return { state, added: false, isDuplicate: false };

  const cleanKey = cleanWordText(clean).toLowerCase();
  const exists = state.words.some((w) => cleanWordText(w.text).toLowerCase() === cleanKey);
  if (exists) {
    return { state, added: false, isDuplicate: true };
  }

  const newItem = createInitialLernwortItem(clean);
  const updatedWords = [...state.words, newItem];
  const updatedAbc = [...state.abcOrder, newItem.id];

  return {
    state: {
      ...state,
      words: updatedWords,
      abcOrder: updatedAbc,
    },
    added: true,
    isDuplicate: false,
  };
}

/**
 * Wort bearbeiten
 */
export function editWord(
  state: LernwoerterStudioState,
  wordId: string,
  newText: string
): LernwoerterStudioState {
  const clean = sanitizeWord(newText);
  if (!clean) return state;

  const updatedWords = state.words.map((w) => {
    if (w.id !== wordId) return w;
    // Wenn das Wort geändert wird, ungültig gewordene Highlights filtern
    const validHighlights = w.highlights.filter((h) => h.endIndex <= clean.length);
    return {
      ...w,
      text: clean,
      highlights: validHighlights,
    };
  });

  return {
    ...state,
    words: updatedWords,
  };
}

/**
 * Wort löschen
 */
export function deleteWord(
  state: LernwoerterStudioState,
  wordId: string
): LernwoerterStudioState {
  const updatedWords = state.words.filter((w) => w.id !== wordId);
  const updatedAbc = state.abcOrder.filter((id) => id !== wordId);
  const newIndex = Math.min(state.currentIndex, Math.max(0, updatedWords.length - 1));

  return {
    ...state,
    words: updatedWords,
    abcOrder: updatedAbc,
    currentIndex: newIndex,
  };
}

/**
 * Navigation im Wort-Katalog
 */
export function getActiveWordIndex(state: LernwoerterStudioState): number {
  if (state.words.length === 0) return 0;
  if (state.isShuffle && state.shuffleOrder.length === state.words.length) {
    const permIdx = state.currentIndex % state.shuffleOrder.length;
    return state.shuffleOrder[permIdx];
  }
  return state.currentIndex % state.words.length;
}

export function nextWord(state: LernwoerterStudioState): LernwoerterStudioState {
  if (state.words.length === 0) return state;
  const nextIdx = (state.currentIndex + 1) % state.words.length;
  return {
    ...state,
    currentIndex: nextIdx,
  };
}

export function prevWord(state: LernwoerterStudioState): LernwoerterStudioState {
  if (state.words.length === 0) return state;
  const prevIdx = (state.currentIndex - 1 + state.words.length) % state.words.length;
  return {
    ...state,
    currentIndex: prevIdx,
  };
}

export function toggleCoverWord(state: LernwoerterStudioState): LernwoerterStudioState {
  return {
    ...state,
    isCovered: !state.isCovered,
  };
}

export function toggleShuffle(state: LernwoerterStudioState): LernwoerterStudioState {
  const newShuffle = !state.isShuffle;
  let newOrder: number[] = [];
  if (newShuffle && state.words.length > 0) {
    newOrder = state.words.map((_, i) => i).sort(() => Math.random() - 0.5);
  }
  return {
    ...state,
    isShuffle: newShuffle,
    shuffleOrder: newOrder,
    currentIndex: 0,
  };
}

/**
 * Stolperstelle markieren oder umschalten
 * Unterstützt manuelle Zeichenselektion durch Start/End-Indizes
 */
export function toggleWordHighlight(
  state: LernwoerterStudioState,
  wordId: string,
  startIndex: number,
  endIndex: number,
  category: StolperstelleCategory = 'custom'
): LernwoerterStudioState {
  const targetWord = state.words.find((w) => w.id === wordId);
  if (!targetWord) return state;

  const validStart = Math.max(0, Math.min(startIndex, targetWord.text.length));
  const validEnd = Math.max(validStart, Math.min(endIndex, targetWord.text.length));
  if (validStart === validEnd) return state;

  const chars = targetWord.text.slice(validStart, validEnd);

  // Prüfen, ob eine exakt überlappende Markierung bereits existiert
  const existingIdx = targetWord.highlights.findIndex(
    (h) => h.startIndex === validStart && h.endIndex === validEnd
  );

  let newHighlights: WordHighlight[];
  if (existingIdx >= 0) {
    // Entfernen
    newHighlights = targetWord.highlights.filter((_, idx) => idx !== existingIdx);
  } else {
    // Neu hinzufügen
    const newHighlight: WordHighlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      startIndex: validStart,
      endIndex: validEnd,
      chars,
      category,
    };
    newHighlights = [...targetWord.highlights, newHighlight].sort(
      (a, b) => a.startIndex - b.startIndex
    );
  }

  const updatedWords = state.words.map((w) =>
    w.id === wordId ? { ...w, highlights: newHighlights } : w
  );

  return {
    ...state,
    words: updatedWords,
  };
}

export function clearWordHighlights(
  state: LernwoerterStudioState,
  wordId: string
): LernwoerterStudioState {
  const updatedWords = state.words.map((w) =>
    w.id === wordId ? { ...w, highlights: [] } : w
  );
  return {
    ...state,
    words: updatedWords,
  };
}

/**
 * ABC-Sortierung (Österreich / Deutschland)
 * Verwendet Intl.Collator mit 'de-AT' Locale und sensitivity: 'base'
 * - Ä, Ö, Ü werden standardgemäß eingeordnet (Ä wie A bzw. DIN 5007-1/2)
 * - ß wird wie ss eingeordnet
 * - Groß-/Kleinschreibung wird case-insensitive verglichen
 * - Originalschreibweise bleibt vollständig erhalten!
 */
export function sortWordsDeAt(words: string[]): string[] {
  const collator = new Intl.Collator('de-AT', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });

  return [...words].sort((a, b) => {
    const cleanA = cleanWordText(a);
    const cleanB = cleanWordText(b);
    const cmp = collator.compare(cleanA, cleanB);
    if (cmp !== 0) return cmp;
    // Tie-breaker falls nur Groß-/Kleinschreibung oder Trennzeichen unterschiedlich sind
    return a.localeCompare(b, 'de-AT');
  });
}

/**
 * Überprüft, ob eine Liste alphabetisch korrekt sortiert ist
 */
export function checkAbcOrder(
  currentWords: string[]
): { isCorrect: boolean; incorrectIndices: number[] } {
  if (currentWords.length <= 1) {
    return { isCorrect: true, incorrectIndices: [] };
  }

  const collator = new Intl.Collator('de-AT', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });

  const incorrectIndices: number[] = [];
  for (let i = 0; i < currentWords.length - 1; i++) {
    const current = cleanWordText(currentWords[i]);
    const next = cleanWordText(currentWords[i + 1]);
    const cmp = collator.compare(current, next);
    if (cmp > 0) {
      incorrectIndices.push(i + 1);
    }
  }

  return {
    isCorrect: incorrectIndices.length === 0,
    incorrectIndices,
  };
}

/**
 * Verschiebt ein Element in der ABC-Reihenfolge
 */
export function moveAbcItem(
  abcOrder: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  if (
    fromIndex < 0 ||
    fromIndex >= abcOrder.length ||
    toIndex < 0 ||
    toIndex >= abcOrder.length ||
    fromIndex === toIndex
  ) {
    return abcOrder;
  }

  const result = [...abcOrder];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Automatische ABC-Sortierung anwenden
 */
export function applyAutoAbcSort(state: LernwoerterStudioState): LernwoerterStudioState {
  const collator = new Intl.Collator('de-AT', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });

  const sortedItems = [...state.words].sort((a, b) => {
    const cmp = collator.compare(cleanWordText(a.text), cleanWordText(b.text));
    if (cmp !== 0) return cmp;
    return a.text.localeCompare(b.text, 'de-AT');
  });

  return {
    ...state,
    abcOrder: sortedItems.map((w) => w.id),
  };
}

/**
 * Migration von Alt-Widgets:
 * - vocabulary -> Lernwörter-Studio mit Modus 'cards'
 * - spellingdetective -> Lernwörter-Studio mit Modus 'spelling'
 * - abcorder -> Lernwörter-Studio mit Modus 'alphabet'
 * Keine Gamification/Streaks, reine Fachdaten
 */
export function migrateLegacyWidgetSettings(
  widgetType: string,
  oldSettings?: any,
  appLernwoerter?: any
): LernwoerterStudioState {
  let mode: LernwoerterMode = 'cards';
  let initialWords: string[] = [];

  if (widgetType === 'spellingdetective') {
    mode = 'spelling';
    // Falls Wörter im alten Detektiv hinterlegt waren
    if (oldSettings?.words && Array.isArray(oldSettings.words)) {
      initialWords = oldSettings.words;
    } else {
      // Sinnvoller Grundwortschatz aus dem alten Wort-Detektiv
      initialWords = ['Hund', 'Brot', 'Kind', 'meine', 'liegt', 'fliegt', 'lernen', 'Fahrrad', 'scheint', 'Kreide'];
    }
  } else if (widgetType === 'abcorder') {
    mode = 'alphabet';
    if (oldSettings?.words && Array.isArray(oldSettings.words)) {
      initialWords = oldSettings.words;
    } else {
      initialWords = ['Auge', 'Baum', 'Dach', 'Fisch', 'Gras', 'Hand', 'Insel', 'Katze'];
    }
  } else {
    // vocabulary oder lernwoerter
    mode = 'cards';
    if (oldSettings?.words && Array.isArray(oldSettings.words) && oldSettings.words.length > 0) {
      initialWords = oldSettings.words.map((w: any) => (typeof w === 'string' ? w : w.text));
    } else if (appLernwoerter?.aktuelleListe && Array.isArray(appLernwoerter.aktuelleListe) && appLernwoerter.aktuelleListe.length > 0) {
      initialWords = appLernwoerter.aktuelleListe;
    } else {
      initialWords = DEFAULT_LERNWOERTER;
    }
  }

  const baseState = getInitialLernwoerterStudioState(initialWords, mode);

  // Falls alte Highlights oder Reihenfolge vorhanden
  if (oldSettings?.highlights && typeof oldSettings.highlights === 'object') {
    baseState.words = baseState.words.map((w) => {
      const hl = oldSettings.highlights[w.id] || oldSettings.highlights[w.text];
      return hl ? { ...w, highlights: hl } : w;
    });
  }

  return baseState;
}
