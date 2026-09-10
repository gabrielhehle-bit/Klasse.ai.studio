/**
 * Wort- & Satzwerkstatt Algorithmus & Datenstrukturen
 * F26.2 Konsolidierung von wordbuilder, compoundsplit, scrambler und sentencebuilding
 * 100% offline, deterministisch, ohne KI, ohne externe Netzwerkrequests.
 * Keine Gamification (keine Punkte, Sterne, Streaks, Töne, Coins).
 */

export type WortSatzMode = 'word' | 'compound' | 'sentence';

export interface WordTask {
  id: string;
  targetWord: string;
  parts: string[]; // z.B. ['H', 'A', 'U', 'S'] oder ['ELE', 'FANT']
  type: 'letters' | 'syllables';
}

export interface CompoundTask {
  id: string;
  word: string; // Gesamtwort, z.B. "Haustür"
  parts: string[]; // Bestandteile, z.B. ["Haus", "Tür"] oder ["Geburt", "s", "Tag"]
  fugenIndex?: number; // optionaler Index des Fugenelements, z.B. 1 bei ["Geburt", "s", "Tag"]
  article?: string; // z.B. "die", "der", "das"
}

export interface SentenceTask {
  id: string;
  originalSentence: string; // z.B. "Der Hund läuft schnell."
  words: string[]; // z.B. ["Der", "Hund", "läuft", "schnell."]
}

export interface WortSatzWerkstattState {
  mode: WortSatzMode;
  wordTasks: WordTask[];
  compoundTasks: CompoundTask[];
  sentenceTasks: SentenceTask[];
  currentTaskIndex: number;
  currentItems: string[]; // Aktuelle Anordnung der Teile auf der Arbeitsfläche
  selectedIndex: number | null; // Für Tastatur-/Klick-Steuerung (Verschieben links/rechts)
  isSolved: boolean;
  checkFeedback: 'correct' | 'incorrect' | null; // "Passt." oder "Noch nicht ganz."
  showSolution: boolean;
  isCovered?: boolean; // Für Modus 'word': Zielwort verdecken / aufdecken
  isCompoundSeparated?: boolean; // Für Modus 'compound': Zusammengesetzt vs. getrennt
}

/**
 * Standard-Wortaufgaben (Buchstaben & Silben)
 */
export const DEFAULT_WORD_TASKS: WordTask[] = [
  // Silben (aus wordbuilder)
  { id: 'w-syll-1', targetWord: 'ELEFANT', parts: ['ELE', 'FANT'], type: 'syllables' },
  { id: 'w-syll-2', targetWord: 'REGENSCHIRM', parts: ['RE', 'GEN', 'SCHIRM'], type: 'syllables' },
  { id: 'w-syll-3', targetWord: 'APFELBAUM', parts: ['AP', 'FEL', 'BAUM'], type: 'syllables' },
  { id: 'w-syll-4', targetWord: 'SCHULRANZEN', parts: ['SCHUL', 'RAN', 'ZEN'], type: 'syllables' },
  { id: 'w-syll-5', targetWord: 'KLASSENZIMMER', parts: ['KLAS', 'SEN', 'ZIM', 'MER'], type: 'syllables' },
  { id: 'w-syll-6', targetWord: 'SPIELPLATZ', parts: ['SPIEL', 'PLATZ'], type: 'syllables' },
  { id: 'w-syll-7', targetWord: 'SCHMETTERLING', parts: ['SCHMET', 'TER', 'LING'], type: 'syllables' },
  { id: 'w-syll-8', targetWord: 'COMPUTER', parts: ['COM', 'PU', 'TER'], type: 'syllables' },
  { id: 'w-syll-9', targetWord: 'ABENTEUER', parts: ['AB', 'EN', 'TEU', 'ER'], type: 'syllables' },
  { id: 'w-syll-10', targetWord: 'WINTERZEIT', parts: ['WIN', 'TER', 'ZEIT'], type: 'syllables' },
  // Buchstaben
  { id: 'w-lett-1', targetWord: 'HAUS', parts: ['H', 'A', 'U', 'S'], type: 'letters' },
  { id: 'w-lett-2', targetWord: 'SONNE', parts: ['S', 'O', 'N', 'N', 'E'], type: 'letters' },
  { id: 'w-lett-3', targetWord: 'BLUME', parts: ['B', 'L', 'U', 'M', 'E'], type: 'letters' },
  { id: 'w-lett-4', targetWord: 'KATZE', parts: ['K', 'A', 'T', 'Z', 'E'], type: 'letters' },
  { id: 'w-lett-5', targetWord: 'TISCH', parts: ['T', 'I', 'S', 'C', 'H'], type: 'letters' },
  { id: 'w-lett-6', targetWord: 'SCHULE', parts: ['S', 'C', 'H', 'U', 'L', 'E'], type: 'letters' },
  { id: 'w-lett-7', targetWord: 'BUCH', parts: ['B', 'U', 'C', 'H'], type: 'letters' },
];

/**
 * Standard-Komposita (aus compoundsplit & didaktische Grundwortschatz-Komposita)
 */
export const DEFAULT_COMPOUND_TASKS: CompoundTask[] = [
  { id: 'c-1', word: 'Haustür', parts: ['Haus', 'Tür'], article: 'die' },
  { id: 'c-2', word: 'Sonnenblume', parts: ['Sonne', 'n', 'Blume'], fugenIndex: 1, article: 'die' },
  { id: 'c-3', word: 'Fußballplatz', parts: ['Fußball', 'Platz'], article: 'der' },
  { id: 'c-4', word: 'Regenjacke', parts: ['Regen', 'Jacke'], article: 'die' },
  { id: 'c-5', word: 'Baumhaus', parts: ['Baum', 'Haus'], article: 'das' },
  { id: 'c-6', word: 'Schultasche', parts: ['Schul', 'Tasche'], article: 'die' },
  { id: 'c-7', word: 'Spielplatz', parts: ['Spiel', 'Platz'], article: 'der' },
  { id: 'c-8', word: 'Klassenzimmer', parts: ['Klasse', 'n', 'Zimmer'], fugenIndex: 1, article: 'das' },
  { id: 'c-9', word: 'Feuerwehrschlauch', parts: ['Feuerwehr', 'Schlauch'], article: 'der' },
  { id: 'c-10', word: 'Kühlschranktür', parts: ['Kühlschrank', 'Tür'], article: 'die' },
  { id: 'c-11', word: 'Zahnputzbecher', parts: ['Zahnputz', 'Becher'], article: 'der' },
  { id: 'c-12', word: 'Geburtstag', parts: ['Geburt', 's', 'Tag'], fugenIndex: 1, article: 'der' },
  { id: 'c-13', word: 'Wintermantel', parts: ['Winter', 'Mantel'], article: 'der' },
  { id: 'c-14', word: 'Kindergarten', parts: ['Kind', 'er', 'Garten'], fugenIndex: 1, article: 'der' },
];

/**
 * Zerlegt einen Satz unter Beibehaltung aller Satzzeichen und Großschreibung in Wortkarten.
 */
export function splitSentenceIntoWords(sentence: string): string[] {
  if (!sentence || typeof sentence !== 'string') return [];
  return sentence.trim().split(/\s+/).filter(Boolean);
}

/**
 * Standard-Satzaufgaben (didaktisch wertvoll, Zeichensetzung & Großschreibung strikt erhalten)
 */
export const DEFAULT_SENTENCE_TASKS: SentenceTask[] = [
  {
    id: 's-1',
    originalSentence: 'Der Hund läuft schnell.',
    words: ['Der', 'Hund', 'läuft', 'schnell.'],
  },
  {
    id: 's-2',
    originalSentence: 'Die Kinder lesen ein spannendes Buch.',
    words: ['Die', 'Kinder', 'lesen', 'ein', 'spannendes', 'Buch.'],
  },
  {
    id: 's-3',
    originalSentence: 'Im Sommer scheint die warme Sonne.',
    words: ['Im', 'Sommer', 'scheint', 'die', 'warme', 'Sonne.'],
  },
  {
    id: 's-4',
    originalSentence: 'Die Lehrerin erklärt die neue Aufgabe.',
    words: ['Die', 'Lehrerin', 'erklärt', 'die', 'neue', 'Aufgabe.'],
  },
  {
    id: 's-5',
    originalSentence: 'Auf dem Spielplatz bauen wir ein Baumhaus.',
    words: ['Auf', 'dem', 'Spielplatz', 'bauen', 'wir', 'ein', 'Baumhaus.'],
  },
  {
    id: 's-6',
    originalSentence: 'Heute essen wir frische Äpfel.',
    words: ['Heute', 'essen', 'wir', 'frische', 'Äpfel.'],
  },
  {
    id: 's-7',
    originalSentence: 'Das kleine Kätzchen schläft im Korb.',
    words: ['Das', 'kleine', 'Kätzchen', 'schläft', 'im', 'Korb.'],
  },
  {
    id: 's-8',
    originalSentence: 'Wir singen fröhlich im Klassenzimmer.',
    words: ['Wir', 'singen', 'fröhlich', 'im', 'Klassenzimmer.'],
  },
];

/**
 * Deterministisches oder zufälliges Mischen eines Arrays.
 * Stellt sicher, dass das Array bei mehr als einem Element gemischt ist
 * (kein versehentlicher Sofort-Lösungszustand beim Start).
 */
export function shuffleArray<T>(arr: T[], seed?: number): T[] {
  if (arr.length <= 1) return [...arr];
  const copy = [...arr];

  // Fisher-Yates shuffle
  let rng = seed !== undefined ? pseudoRandom(seed) : Math.random;
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  // Falls zufällig exakt identisch mit Ursprung: rotiere um 1
  const isIdentical = copy.every((val, idx) => val === arr[idx]);
  if (isIdentical && copy.length > 1) {
    const first = copy.shift()!;
    copy.push(first);
  }

  return copy;
}

function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Liefert die Ziel-Teile (Lösung) für die aktuelle Aufgabe
 */
export function getCanonicalParts(
  mode: WortSatzMode,
  task: WordTask | CompoundTask | SentenceTask
): string[] {
  if (mode === 'word') {
    return [...(task as WordTask).parts];
  }
  if (mode === 'compound') {
    return [...(task as CompoundTask).parts];
  }
  return [...(task as SentenceTask).words];
}

/**
 * Initialisiert die gemischten Teile für eine Aufgabe
 */
export function initializeTaskItems(
  mode: WortSatzMode,
  task: WordTask | CompoundTask | SentenceTask
): string[] {
  const parts = getCanonicalParts(mode, task);
  return shuffleArray(parts);
}

/**
 * Tauscht zwei Elemente an benachbarten Positionen (Linksverschiebung)
 */
export function moveItemLeft(
  items: string[],
  index: number
): { newItems: string[]; newIndex: number } {
  if (index <= 0 || index >= items.length) {
    return { newItems: [...items], newIndex: index };
  }
  const newItems = [...items];
  [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
  return { newItems, newIndex: index - 1 };
}

/**
 * Tauscht zwei Elemente an benachbarten Positionen (Rechtsverschiebung)
 */
export function moveItemRight(
  items: string[],
  index: number
): { newItems: string[]; newIndex: number } {
  if (index < 0 || index >= items.length - 1) {
    return { newItems: [...items], newIndex: index };
  }
  const newItems = [...items];
  [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
  return { newItems, newIndex: index + 1 };
}

/**
 * Prüft den Wort-Modus (Wort bauen)
 * Buchstaben oder Silben müssen zusammengesetzt dem Zielwort entsprechen.
 */
export function checkWordTask(currentItems: string[], targetWord: string): boolean {
  if (!targetWord) return false;
  const current = currentItems.join('').replace(/\s+/g, '').toUpperCase();
  const target = targetWord.replace(/\s+/g, '').toUpperCase();
  return current === target;
}

/**
 * Prüft den Kompositum-Modus (Wörter zerlegen / anordnen)
 * Bestandteile müssen in der richtigen Reihenfolge stehen.
 */
export function checkCompoundTask(currentItems: string[], expectedParts: string[]): boolean {
  if (currentItems.length !== expectedParts.length) return false;
  return currentItems.every(
    (item, idx) => item.trim().toLowerCase() === expectedParts[idx].trim().toLowerCase()
  );
}

/**
 * Prüft den Satz-Modus (Sätze bauen)
 * Exakter Wortkarten-Vergleich unter Beibehaltung von Satzzeichen und Groß-/Kleinschreibung.
 */
export function checkSentenceTask(currentItems: string[], expectedWords: string[]): boolean {
  if (currentItems.length !== expectedWords.length) return false;
  return currentItems.every((item, idx) => item.trim() === expectedWords[idx].trim());
}

/**
 * Zentrale Prüffunktion
 * Rückgabe: true wenn Lösung korrekt ist, sonst false
 */
export function checkCurrentTask(
  state: WortSatzWerkstattState
): boolean {
  const { mode, currentItems, currentTaskIndex } = state;
  if (mode === 'word') {
    const task = state.wordTasks[currentTaskIndex];
    if (!task) return false;
    return checkWordTask(currentItems, task.targetWord);
  }
  if (mode === 'compound') {
    const task = state.compoundTasks[currentTaskIndex];
    if (!task) return false;
    return checkCompoundTask(currentItems, task.parts);
  }
  if (mode === 'sentence') {
    const task = state.sentenceTasks[currentTaskIndex];
    if (!task) return false;
    return checkSentenceTask(currentItems, task.words);
  }
  return false;
}

/**
 * Erzeugt einen initialen Zustand der Wort- & Satzwerkstatt
 */
export function createInitialWortSatzState(
  initialMode: WortSatzMode = 'word',
  customWords?: WordTask[],
  customCompounds?: CompoundTask[],
  customSentences?: SentenceTask[]
): WortSatzWerkstattState {
  const wordTasks = customWords && customWords.length > 0 ? customWords : DEFAULT_WORD_TASKS;
  const compoundTasks =
    customCompounds && customCompounds.length > 0 ? customCompounds : DEFAULT_COMPOUND_TASKS;
  const sentenceTasks =
    customSentences && customSentences.length > 0 ? customSentences : DEFAULT_SENTENCE_TASKS;

  let activeTask: WordTask | CompoundTask | SentenceTask = wordTasks[0];
  if (initialMode === 'compound') activeTask = compoundTasks[0];
  if (initialMode === 'sentence') activeTask = sentenceTasks[0];

  const currentItems = initializeTaskItems(initialMode, activeTask);

  return {
    mode: initialMode,
    wordTasks,
    compoundTasks,
    sentenceTasks,
    currentTaskIndex: 0,
    currentItems,
    selectedIndex: null,
    isSolved: false,
    checkFeedback: null,
    showSolution: false,
    isCovered: false,
    isCompoundSeparated: false,
  };
}

/**
 * Legacy-Migration:
 * Konvertiert Einstellungen von:
 * - 'wordbuilder' -> mode: 'word'
 * - 'compoundsplit' -> mode: 'compound'
 * - 'scrambler' -> mode: 'sentence'
 * - 'sentencebuilding' -> mode: 'sentence'
 *
 * Verwirft alle Gamification-Daten (Scores, Streaks, Töne, AI-Flags).
 */
export function migrateLegacyWortSatzWidgetSettings(
  legacyType: string,
  oldSettings?: any
): WortSatzWerkstattState {
  let targetMode: WortSatzMode = 'word';

  if (legacyType === 'compoundsplit') {
    targetMode = 'compound';
  } else if (legacyType === 'sentencebuilding' || legacyType === 'scrambler') {
    targetMode = 'sentence';
  } else if (legacyType === 'wordbuilder') {
    targetMode = 'word';
  }

  // Falls schon eine Wort- & Satzwerkstatt vorliegt
  if (oldSettings && oldSettings.mode && (oldSettings.wordTasks || oldSettings.sentenceTasks)) {
    const validMode: WortSatzMode = ['word', 'compound', 'sentence'].includes(oldSettings.mode)
      ? oldSettings.mode
      : targetMode;

    const wordTasks = Array.isArray(oldSettings.wordTasks) && oldSettings.wordTasks.length > 0
      ? oldSettings.wordTasks
      : DEFAULT_WORD_TASKS;
    const compoundTasks = Array.isArray(oldSettings.compoundTasks) && oldSettings.compoundTasks.length > 0
      ? oldSettings.compoundTasks
      : DEFAULT_COMPOUND_TASKS;
    const sentenceTasks = Array.isArray(oldSettings.sentenceTasks) && oldSettings.sentenceTasks.length > 0
      ? oldSettings.sentenceTasks
      : DEFAULT_SENTENCE_TASKS;

    let taskIdx = typeof oldSettings.currentTaskIndex === 'number' ? oldSettings.currentTaskIndex : 0;
    const maxIdx =
      validMode === 'word'
        ? wordTasks.length - 1
        : validMode === 'compound'
        ? compoundTasks.length - 1
        : sentenceTasks.length - 1;
    taskIdx = Math.max(0, Math.min(taskIdx, maxIdx));

    let activeTask: WordTask | CompoundTask | SentenceTask = wordTasks[taskIdx];
    if (validMode === 'compound') activeTask = compoundTasks[taskIdx];
    if (validMode === 'sentence') activeTask = sentenceTasks[taskIdx];

    const currentItems =
      Array.isArray(oldSettings.currentItems) && oldSettings.currentItems.length > 0
        ? oldSettings.currentItems
        : initializeTaskItems(validMode, activeTask);

    return {
      mode: validMode,
      wordTasks,
      compoundTasks,
      sentenceTasks,
      currentTaskIndex: taskIdx,
      currentItems,
      selectedIndex: null,
      isSolved: !!oldSettings.isSolved,
      checkFeedback: null,
      showSolution: false,
      isCovered: !!oldSettings.isCovered,
      isCompoundSeparated: !!oldSettings.isCompoundSeparated,
    };
  }

  // Neuer State basierend auf Zielmodus
  return createInitialWortSatzState(targetMode);
}
