/**
 * Fachalgorithmus & Datenmodell für das Deutsch-Widget 🎭 Story-Emojis (F26.3)
 *
 * Leitfrage: „Wie kann ich mit wenigen Bildimpulsen eine Geschichte erzählen oder schreiben?“
 *
 * 100% lokal, deterministisch, ohne KI, ohne Gamification, ohne Netzwerkzugriffe.
 */

export type StoryCategoryKey =
  | 'personen'
  | 'tiere'
  | 'orte'
  | 'dinge'
  | 'wetter'
  | 'gefuehle'
  | 'ereignisse';

export interface StoryCategoryInfo {
  key: StoryCategoryKey;
  label: string;
  icon: string;
}

export const STORY_CATEGORIES: StoryCategoryInfo[] = [
  { key: 'personen', label: 'Personen & Wesen', icon: '🧙' },
  { key: 'tiere', label: 'Tiere', icon: '🐶' },
  { key: 'orte', label: 'Orte', icon: '🏰' },
  { key: 'dinge', label: 'Dinge & Schätze', icon: '🚲' },
  { key: 'wetter', label: 'Wetter & Natur', icon: '🌧️' },
  { key: 'gefuehle', label: 'Gefühle', icon: '😊' },
  { key: 'ereignisse', label: 'Ereignisse', icon: '🎂' },
];

export interface StoryEmojiDefinition {
  id: string;
  emoji: string;
  label: string;
  category: StoryCategoryKey;
}

/**
 * Strukturierter Pool didaktisch passender Emojis mit neutralen deutschen Bezeichnungen
 */
export const STORY_EMOJI_POOL: StoryEmojiDefinition[] = [
  // 1. Personen & Fabelwesen
  { id: 'p_zauberer', emoji: '🧙', label: 'Zauberer', category: 'personen' },
  { id: 'p_prinzessin', emoji: '👸', label: 'Prinzessin', category: 'personen' },
  { id: 'p_detektiv', emoji: '🕵️', label: 'Detektiv', category: 'personen' },
  { id: 'p_astronautin', emoji: '👩‍🚀', label: 'Astronautin', category: 'personen' },
  { id: 'p_pirat', emoji: '🏴‍☠️', label: 'Pirat', category: 'personen' },
  { id: 'p_roboter', emoji: '🤖', label: 'Roboter', category: 'personen' },
  { id: 'p_kind', emoji: '👶', label: 'Baby', category: 'personen' },
  { id: 'p_oma', emoji: '👵', label: 'Oma', category: 'personen' },
  { id: 'p_ninja', emoji: '🥷', label: 'Ninja', category: 'personen' },
  { id: 'p_fee', emoji: '🧚', label: 'Fee', category: 'personen' },
  { id: 'p_geist', emoji: '👻', label: 'Gespenst', category: 'personen' },
  { id: 'p_superheld', emoji: '🦸', label: 'Held', category: 'personen' },
  { id: 'p_koenig', emoji: '🤴', label: 'Prinz', category: 'personen' },
  { id: 'p_meerjungfrau', emoji: '🧜', label: 'Nixe', category: 'personen' },

  // 2. Tiere
  { id: 't_hund', emoji: '🐶', label: 'Hund', category: 'tiere' },
  { id: 't_katze', emoji: '🐱', label: 'Katze', category: 'tiere' },
  { id: 't_loewe', emoji: '🦁', label: 'Löwe', category: 'tiere' },
  { id: 't_panda', emoji: '🐼', label: 'Panda', category: 'tiere' },
  { id: 't_fuchs', emoji: '🦊', label: 'Fuchs', category: 'tiere' },
  { id: 't_frosch', emoji: '🐸', label: 'Frosch', category: 'tiere' },
  { id: 't_baer', emoji: '🐻', label: 'Bär', category: 'tiere' },
  { id: 't_biene', emoji: '🐝', label: 'Biene', category: 'tiere' },
  { id: 't_eule', emoji: '🦉', label: 'Eule', category: 'tiere' },
  { id: 't_delfin', emoji: '🐬', label: 'Delfin', category: 'tiere' },
  { id: 't_dino', emoji: '🦖', label: 'Dinosaurier', category: 'tiere' },
  { id: 't_hase', emoji: '🐰', label: 'Hase', category: 'tiere' },
  { id: 't_pferd', emoji: '🐴', label: 'Pferd', category: 'tiere' },
  { id: 't_einhorn', emoji: '🦄', label: 'Einhorn', category: 'tiere' },
  { id: 't_drache', emoji: '🐉', label: 'Drache', category: 'tiere' },

  // 3. Orte
  { id: 'o_schloss', emoji: '🏰', label: 'Schloss', category: 'orte' },
  { id: 'o_insel', emoji: '🏝️', label: 'Insel', category: 'orte' },
  { id: 'o_wald', emoji: '🌲', label: 'Wald', category: 'orte' },
  { id: 'o_haus', emoji: '🏠', label: 'Haus', category: 'orte' },
  { id: 'o_zelt', emoji: '⛺', label: 'Zelt', category: 'orte' },
  { id: 'o_schule', emoji: '🏫', label: 'Schule', category: 'orte' },
  { id: 'o_wueste', emoji: '🏜️', label: 'Wüste', category: 'orte' },
  { id: 'o_zirkus', emoji: '🎪', label: 'Zirkus', category: 'orte' },
  { id: 'o_weltall', emoji: '🚀', label: 'Weltall', category: 'orte' },
  { id: 'o_berg', emoji: '🏔️', label: 'Berg', category: 'orte' },
  { id: 'o_rummelplatz', emoji: '🎡', label: 'Rummelplatz', category: 'orte' },
  { id: 'o_ufo', emoji: '🛸', label: 'Ufo', category: 'orte' },
  { id: 'o_schiff', emoji: '🚢', label: 'Schiff', category: 'orte' },
  { id: 'o_vulkan', emoji: '🌋', label: 'Vulkan', category: 'orte' },

  // 4. Dinge & Schätze
  { id: 'd_fahrrad', emoji: '🚲', label: 'Fahrrad', category: 'dinge' },
  { id: 'd_geschenk', emoji: '🎁', label: 'Geschenk', category: 'dinge' },
  { id: 'd_schluessel', emoji: '🔑', label: 'Schlüssel', category: 'dinge' },
  { id: 'd_edelstein', emoji: '💎', label: 'Edelstein', category: 'dinge' },
  { id: 'd_rucksack', emoji: '🎒', label: 'Rucksack', category: 'dinge' },
  { id: 'd_trank', emoji: '🧪', label: 'Zaubertrank', category: 'dinge' },
  { id: 'd_zauberstab', emoji: '🪄', label: 'Zauberstab', category: 'dinge' },
  { id: 'd_brief', emoji: '✉️', label: 'Brief', category: 'dinge' },
  { id: 'd_gluehbirne', emoji: '💡', label: 'Glühbirne', category: 'dinge' },
  { id: 'd_kompass', emoji: '🧭', label: 'Kompass', category: 'dinge' },
  { id: 'd_paket', emoji: '📦', label: 'Paket', category: 'dinge' },
  { id: 'd_gitarre', emoji: '🎸', label: 'Gitarre', category: 'dinge' },
  { id: 'd_karte', emoji: '🗺️', label: 'Schatzkarte', category: 'dinge' },
  { id: 'd_spiegel', emoji: '🪞', label: 'Spiegel', category: 'dinge' },
  { id: 'd_apfel', emoji: '🍎', label: 'Apfel', category: 'dinge' },

  // 5. Wetter & Natur
  { id: 'w_sonne', emoji: '☀️', label: 'Sonne', category: 'wetter' },
  { id: 'w_regen', emoji: '🌧️', label: 'Regen', category: 'wetter' },
  { id: 'w_schnee', emoji: '❄️', label: 'Schnee', category: 'wetter' },
  { id: 'w_regenbogen', emoji: '🌈', label: 'Regenbogen', category: 'wetter' },
  { id: 'w_blitz', emoji: '⚡', label: 'Gewitter', category: 'wetter' },
  { id: 'w_welle', emoji: '🌊', label: 'Welle', category: 'wetter' },
  { id: 'w_mond', emoji: '🌙', label: 'Mond', category: 'wetter' },
  { id: 'w_blume', emoji: '🌸', label: 'Blume', category: 'wetter' },
  { id: 'w_blatt', emoji: '🍂', label: 'Herbstblatt', category: 'wetter' },
  { id: 'w_feuer', emoji: '🔥', label: 'Lagerfeuer', category: 'wetter' },

  // 6. Gefühle
  { id: 'g_freude', emoji: '😊', label: 'Freude', category: 'gefuehle' },
  { id: 'g_trauer', emoji: '😢', label: 'Traurigkeit', category: 'gefuehle' },
  { id: 'g_schreck', emoji: '😱', label: 'Schreck', category: 'gefuehle' },
  { id: 'g_wut', emoji: '😡', label: 'Wut', category: 'gefuehle' },
  { id: 'g_nachdenken', emoji: '🤔', label: 'Nachdenken', category: 'gefuehle' },
  { id: 'g_muedigkeit', emoji: '😴', label: 'Müdigkeit', category: 'gefuehle' },
  { id: 'g_party', emoji: '🥳', label: 'Jubel', category: 'gefuehle' },
  { id: 'g_hoffnung', emoji: '🥺', label: 'Hoffnung', category: 'gefuehle' },

  // 7. Ereignisse
  { id: 'e_geburtstag', emoji: '🎂', label: 'Geburtstag', category: 'ereignisse' },
  { id: 'e_fussball', emoji: '⚽', label: 'Fußballspiel', category: 'ereignisse' },
  { id: 'e_wettkampf', emoji: '🏆', label: 'Sieg', category: 'ereignisse' },
  { id: 'e_reise', emoji: '✈️', label: 'Flugreise', category: 'ereignisse' },
  { id: 'e_theater', emoji: '🎭', label: 'Aufführung', category: 'ereignisse' },
  { id: 'e_malen', emoji: '🎨', label: 'Kunst', category: 'ereignisse' },
  { id: 'e_musik', emoji: '🎵', label: 'Musik', category: 'ereignisse' },
  { id: 'e_feuerwerk', emoji: '🎆', label: 'Feuerwerk', category: 'ereignisse' },
  { id: 'e_ballon', emoji: '🎈', label: 'Fest', category: 'ereignisse' },
];

export interface StoryEmojiItem {
  id: string; // Slot-Identifier
  emojiId: string;
  emoji: string;
  label: string;
  category: StoryCategoryKey;
  locked: boolean;
}

export type StoryEmojiCount = 3 | 4 | 5 | 6;

export const STORY_PROMPT_PRESETS: string[] = [
  'Erzähle eine Geschichte.',
  'Schreibe eine Geschichte.',
  'Baue alle Bilder ein.',
  'Beginne mit dem ersten Bild.',
  'Erfinde ein überraschendes Ende.',
];

export interface StoryEmojisSettings {
  emojis: StoryEmojiItem[];
  count: StoryEmojiCount;
  promptPreset: string;
  customPrompt?: string;
  showLabels: boolean;
  selectedCategories?: StoryCategoryKey[];
}

/**
 * Holt einen Pool basierend auf aktivierten Kategorien
 */
export function getFilteredEmojiPool(selectedCategories?: StoryCategoryKey[]): StoryEmojiDefinition[] {
  if (!selectedCategories || selectedCategories.length === 0) {
    return STORY_EMOJI_POOL;
  }
  const filtered = STORY_EMOJI_POOL.filter((item) => selectedCategories.includes(item.category));
  return filtered.length > 0 ? filtered : STORY_EMOJI_POOL;
}

/**
 * Erzeugt eine gemischte Reihe von Emojis, bevorzugt aus verschiedenen Kategorien
 */
export function generateStorySequence(
  currentItems: StoryEmojiItem[] = [],
  targetCount: StoryEmojiCount = 4,
  selectedCategories?: StoryCategoryKey[],
  seedRandom?: () => number
): StoryEmojiItem[] {
  const rand = seedRandom || Math.random;
  const pool = getFilteredEmojiPool(selectedCategories);

  // Bereits genutzte Emoji-IDs sammeln, um Duplikate zu vermeiden
  const usedEmojiIds = new Set<string>();
  const lockedIndices = new Set<number>();

  const result: StoryEmojiItem[] = [];

  // 1. Gesperrte Elemente bis zur Zielanzahl beibehalten
  for (let i = 0; i < targetCount; i++) {
    const existing = currentItems[i];
    if (existing && existing.locked) {
      result[i] = { ...existing };
      usedEmojiIds.add(existing.emojiId);
      lockedIndices.add(i);
    }
  }

  // 2. Verfügbare Kategorien für abwechslungsreiche Mischung ermitteln
  const activeCategories: StoryCategoryKey[] =
    selectedCategories && selectedCategories.length > 0
      ? selectedCategories
      : STORY_CATEGORIES.map((c) => c.key);

  // Kategorien zufällig mischen für diese Sequenz
  const shuffledCats = [...activeCategories].sort(() => rand() - 0.5);

  let catRound = 0;

  for (let i = 0; i < targetCount; i++) {
    if (lockedIndices.has(i)) {
      continue;
    }

    // Bevorzuge eine andere Kategorie für diesen Slot
    const preferredCat = shuffledCats[catRound % shuffledCats.length];
    catRound++;

    // Filtere Kandidaten
    let candidates = pool.filter(
      (item) => item.category === preferredCat && !usedEmojiIds.has(item.id)
    );

    // Falls in der bevorzugten Kategorie nichts mehr frei ist, nimm aus beliebigem Pool
    if (candidates.length === 0) {
      candidates = pool.filter((item) => !usedEmojiIds.has(item.id));
    }

    // Falls alle genutzt sind, nimm aus gesamtem Pool
    if (candidates.length === 0) {
      candidates = pool;
    }

    const picked = candidates[Math.floor(rand() * candidates.length)];
    usedEmojiIds.add(picked.id);

    result[i] = {
      id: `slot-${i}-${Date.now().toString(36)}-${Math.floor(rand() * 1000)}`,
      emojiId: picked.id,
      emoji: picked.emoji,
      label: picked.label,
      category: picked.category,
      locked: false,
    };
  }

  return result;
}

/**
 * Tauscht ein einzelnes Emoji an einer Position gegen ein neues aus
 */
export function rerollSingleEmoji(
  items: StoryEmojiItem[],
  index: number,
  selectedCategories?: StoryCategoryKey[],
  seedRandom?: () => number
): StoryEmojiItem[] {
  if (index < 0 || index >= items.length) return items;
  const rand = seedRandom || Math.random;
  const pool = getFilteredEmojiPool(selectedCategories);

  // IDs aller anderen aktuell genutzten Emojis ausschließen
  const usedEmojiIds = new Set<string>();
  items.forEach((item, i) => {
    if (i !== index) usedEmojiIds.add(item.emojiId);
  });

  const currentItem = items[index];

  // Bevorzuge gleiche Kategorie oder beliebige noch ungenutzte
  let candidates = pool.filter((item) => item.id !== currentItem.emojiId && !usedEmojiIds.has(item.id));

  if (candidates.length === 0) {
    candidates = pool.filter((item) => item.id !== currentItem.emojiId);
  }

  if (candidates.length === 0) {
    candidates = pool;
  }

  const picked = candidates[Math.floor(rand() * candidates.length)];

  const updated = [...items];
  updated[index] = {
    ...currentItem,
    emojiId: picked.id,
    emoji: picked.emoji,
    label: picked.label,
    category: picked.category,
  };

  return updated;
}

/**
 * Schaltet den Lock-Status eines Emojis um
 */
export function toggleLockEmoji(items: StoryEmojiItem[], index: number): StoryEmojiItem[] {
  if (index < 0 || index >= items.length) return items;
  const updated = [...items];
  updated[index] = {
    ...updated[index],
    locked: !updated[index].locked,
  };
  return updated;
}

/**
 * Verschiebt ein Emoji nach links
 */
export function moveEmojiLeft(items: StoryEmojiItem[], index: number): StoryEmojiItem[] {
  if (index <= 0 || index >= items.length) return items;
  const updated = [...items];
  const temp = updated[index];
  updated[index] = updated[index - 1];
  updated[index - 1] = temp;
  return updated;
}

/**
 * Verschiebt ein Emoji nach rechts
 */
export function moveEmojiRight(items: StoryEmojiItem[], index: number): StoryEmojiItem[] {
  if (index < 0 || index >= items.length - 1) return items;
  const updated = [...items];
  const temp = updated[index];
  updated[index] = updated[index + 1];
  updated[index + 1] = temp;
  return updated;
}

/**
 * Passt die Anzahl der Emojis an (3, 4, 5 oder 6)
 */
export function changeSequenceCount(
  items: StoryEmojiItem[],
  newCount: StoryEmojiCount,
  selectedCategories?: StoryCategoryKey[],
  seedRandom?: () => number
): StoryEmojiItem[] {
  if (items.length === newCount) return items;

  if (newCount < items.length) {
    return items.slice(0, newCount);
  }

  // Auffüllen bis newCount
  return generateStorySequence(items, newCount, selectedCategories, seedRandom);
}

/**
 * Erzeugt den initialen Zustand
 */
export function createInitialStoryEmojisSettings(): StoryEmojisSettings {
  const initialEmojis = generateStorySequence([], 4);
  return {
    emojis: initialEmojis,
    count: 4,
    promptPreset: STORY_PROMPT_PRESETS[0],
    customPrompt: '',
    showLabels: true,
    selectedCategories: STORY_CATEGORIES.map((c) => c.key),
  };
}

/**
 * Migriert alte oder unvollständige Widget-Einstellungen
 */
export function migrateLegacyStoryEmojisSettings(legacySettings?: any): StoryEmojisSettings {
  const base = createInitialStoryEmojisSettings();

  if (!legacySettings || typeof legacySettings !== 'object') {
    return base;
  }

  const validCounts: StoryEmojiCount[] = [3, 4, 5, 6];
  let count: StoryEmojiCount = 4;
  if (typeof legacySettings.count === 'number' && validCounts.includes(legacySettings.count as any)) {
    count = legacySettings.count as StoryEmojiCount;
  } else if (typeof legacySettings.diceCount === 'number') {
    // Altes Limit aus Dice-Version
    if (legacySettings.diceCount <= 3) count = 3;
    else if (legacySettings.diceCount === 5) count = 5;
    else if (legacySettings.diceCount >= 6) count = 6;
    else count = 4;
  }

  let emojis: StoryEmojiItem[] = [];

  if (Array.isArray(legacySettings.emojis) && legacySettings.emojis.length > 0) {
    emojis = legacySettings.emojis
      .slice(0, count)
      .map((item: any, idx: number) => {
        const poolMatch = STORY_EMOJI_POOL.find((p) => p.emoji === item.emoji || p.id === item.emojiId);
        return {
          id: item.id || `slot-${idx}`,
          emojiId: poolMatch ? poolMatch.id : item.emojiId || `custom-${idx}`,
          emoji: item.emoji || (poolMatch ? poolMatch.emoji : '⭐'),
          label: item.label || (poolMatch ? poolMatch.label : 'Bildimpuls'),
          category: item.category || (poolMatch ? poolMatch.category : 'dinge'),
          locked: !!item.locked,
        };
      });

    // Falls weniger als count vorhanden, auffüllen
    if (emojis.length < count) {
      emojis = generateStorySequence(emojis, count);
    }
  } else if (Array.isArray(legacySettings.dice) && legacySettings.dice.length > 0) {
    // Migration aus alter Dice-Struktur
    const migratedItems: StoryEmojiItem[] = legacySettings.dice
      .slice(0, count)
      .map((d: any, idx: number) => {
        const poolMatch = STORY_EMOJI_POOL.find((p) => p.emoji === d.emoji);
        return {
          id: `migrated-${idx}`,
          emojiId: poolMatch ? poolMatch.id : `legacy-${idx}`,
          emoji: d.emoji || '⭐',
          label: poolMatch ? poolMatch.label : 'Bildimpuls',
          category: poolMatch ? poolMatch.category : 'dinge',
          locked: false,
        };
      });
    emojis = generateStorySequence(migratedItems, count);
  } else {
    emojis = generateStorySequence([], count);
  }

  const promptPreset =
    typeof legacySettings.promptPreset === 'string' && legacySettings.promptPreset.trim().length > 0
      ? legacySettings.promptPreset
      : STORY_PROMPT_PRESETS[0];

  const customPrompt =
    typeof legacySettings.customPrompt === 'string' ? legacySettings.customPrompt : '';

  const showLabels =
    typeof legacySettings.showLabels === 'boolean' ? legacySettings.showLabels : true;

  const selectedCategories =
    Array.isArray(legacySettings.selectedCategories) && legacySettings.selectedCategories.length > 0
      ? legacySettings.selectedCategories
      : STORY_CATEGORIES.map((c) => c.key);

  return {
    emojis,
    count,
    promptPreset,
    customPrompt,
    showLabels,
    selectedCategories,
  };
}
