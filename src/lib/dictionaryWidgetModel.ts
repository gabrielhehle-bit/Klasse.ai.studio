export type DictionaryCategory = 'all' | 'school' | 'food' | 'animals' | 'nature';
export type DictionaryMode = 'learn' | 'match';

export interface DictionaryCard {
  id: string;
  emoji: string;
  de: string;
  en: string;
  category: Exclude<DictionaryCategory, 'all'>;
}

export interface DictionaryWidgetSettings {
  category: DictionaryCategory;
  mode: DictionaryMode;
  showEnglish: boolean;
  speakOnChange: boolean;
}

export const DICTIONARY_CATEGORY_LABELS: Record<DictionaryCategory, string> = {
  all: 'Alle',
  school: 'Schule & Spiel',
  food: 'Essen & Trinken',
  animals: 'Tiere',
  nature: 'Natur & Welt',
};

export const DICTIONARY_CARDS: readonly DictionaryCard[] = [
  { id: 'schoolbag', emoji: '🎒', de: 'Die Schultasche', en: 'The school bag', category: 'school' },
  { id: 'pencil', emoji: '✏️', de: 'Der Bleistift', en: 'The pencil', category: 'school' },
  { id: 'book', emoji: '📚', de: 'Das Buch', en: 'The book', category: 'school' },
  { id: 'school', emoji: '🏫', de: 'Die Schule', en: 'The school', category: 'school' },
  { id: 'football', emoji: '⚽', de: 'Der Fußball', en: 'The football', category: 'school' },
  { id: 'balloon', emoji: '🎈', de: 'Der Luftballon', en: 'The balloon', category: 'school' },
  { id: 'gift', emoji: '🎁', de: 'Das Geschenk', en: 'The gift', category: 'school' },
  { id: 'teddy', emoji: '🧸', de: 'Der Teddybär', en: 'The teddy bear', category: 'school' },
  { id: 'paint', emoji: '🎨', de: 'Die Farbe', en: 'The paint', category: 'school' },
  { id: 'guitar', emoji: '🎸', de: 'Die Gitarre', en: 'The guitar', category: 'school' },
  { id: 'scissors', emoji: '✂️', de: 'Die Schere', en: 'The scissors', category: 'school' },

  { id: 'apple', emoji: '🍎', de: 'Der Apfel', en: 'The apple', category: 'food' },
  { id: 'banana', emoji: '🍌', de: 'Die Banane', en: 'The banana', category: 'food' },
  { id: 'milk', emoji: '🥛', de: 'Die Milch', en: 'The milk', category: 'food' },
  { id: 'watermelon', emoji: '🍉', de: 'Die Wassermelone', en: 'The watermelon', category: 'food' },
  { id: 'icecream', emoji: '🍦', de: 'Das Eis', en: 'The ice cream', category: 'food' },
  { id: 'pizza', emoji: '🍕', de: 'Die Pizza', en: 'The pizza', category: 'food' },
  { id: 'strawberry', emoji: '🍓', de: 'Die Erdbeere', en: 'The strawberry', category: 'food' },
  { id: 'cookie', emoji: '🍪', de: 'Der Keks', en: 'The cookie', category: 'food' },
  { id: 'donut', emoji: '🍩', de: 'Der Donut', en: 'The donut', category: 'food' },
  { id: 'popcorn', emoji: '🍿', de: 'Das Popcorn', en: 'The popcorn', category: 'food' },
  { id: 'juice', emoji: '🥤', de: 'Der Saft', en: 'The juice', category: 'food' },

  { id: 'dog', emoji: '🐕', de: 'Der Hund', en: 'The dog', category: 'animals' },
  { id: 'cat', emoji: '🐈', de: 'Die Katze', en: 'The cat', category: 'animals' },
  { id: 'monkey', emoji: '🐒', de: 'Der Affe', en: 'The monkey', category: 'animals' },
  { id: 'lion', emoji: '🦁', de: 'Der Löwe', en: 'The lion', category: 'animals' },
  { id: 'fish', emoji: '🐟', de: 'Der Fisch', en: 'The fish', category: 'animals' },
  { id: 'dinosaur', emoji: '🦖', de: 'Der Dinosaurier', en: 'The dinosaur', category: 'animals' },
  { id: 'unicorn', emoji: '🦄', de: 'Das Einhorn', en: 'The unicorn', category: 'animals' },
  { id: 'fox', emoji: '🦊', de: 'Der Fuchs', en: 'The fox', category: 'animals' },
  { id: 'panda', emoji: '🐼', de: 'Der Panda', en: 'The panda', category: 'animals' },
  { id: 'frog', emoji: '🐸', de: 'Der Frosch', en: 'The frog', category: 'animals' },
  { id: 'bee', emoji: '🐝', de: 'Die Biene', en: 'The bee', category: 'animals' },

  { id: 'house', emoji: '🏠', de: 'Das Haus', en: 'The house', category: 'nature' },
  { id: 'car', emoji: '🚗', de: 'Das Auto', en: 'The car', category: 'nature' },
  { id: 'bicycle', emoji: '🚲', de: 'Das Fahrrad', en: 'The bicycle', category: 'nature' },
  { id: 'sun', emoji: '☀️', de: 'Die Sonne', en: 'The sun', category: 'nature' },
  { id: 'tree', emoji: '🌳', de: 'Der Baum', en: 'The tree', category: 'nature' },
  { id: 'airplane', emoji: '✈️', de: 'Das Flugzeug', en: 'The airplane', category: 'nature' },
  { id: 'clock', emoji: '⏰', de: 'Die Uhr', en: 'The clock', category: 'nature' },
  { id: 'rocket', emoji: '🚀', de: 'Die Rakete', en: 'The rocket', category: 'nature' },
  { id: 'rainbow', emoji: '🌈', de: 'Der Regenbogen', en: 'The rainbow', category: 'nature' },
  { id: 'planet', emoji: '🪐', de: 'Der Planet', en: 'The planet', category: 'nature' },
] as const;

export const DEFAULT_DICTIONARY_WIDGET_SETTINGS: DictionaryWidgetSettings = {
  category: 'all',
  mode: 'learn',
  showEnglish: true,
  speakOnChange: false,
};

const CATEGORY_KEYS = new Set<DictionaryCategory>(Object.keys(DICTIONARY_CATEGORY_LABELS) as DictionaryCategory[]);
const MODE_KEYS = new Set<DictionaryMode>(['learn', 'match']);

export function normalizeDictionaryWidgetSettings(raw: unknown): DictionaryWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    category:
      typeof value.category === 'string' && CATEGORY_KEYS.has(value.category as DictionaryCategory)
        ? value.category as DictionaryCategory
        : DEFAULT_DICTIONARY_WIDGET_SETTINGS.category,
    mode:
      typeof value.mode === 'string' && MODE_KEYS.has(value.mode as DictionaryMode)
        ? value.mode as DictionaryMode
        : DEFAULT_DICTIONARY_WIDGET_SETTINGS.mode,
    showEnglish:
      typeof value.showEnglish === 'boolean'
        ? value.showEnglish
        : DEFAULT_DICTIONARY_WIDGET_SETTINGS.showEnglish,
    speakOnChange:
      typeof value.speakOnChange === 'boolean'
        ? value.speakOnChange
        : DEFAULT_DICTIONARY_WIDGET_SETTINGS.speakOnChange,
  };
}

export function filterDictionaryCards(
  category: DictionaryCategory,
  cards: readonly DictionaryCard[] = DICTIONARY_CARDS,
): DictionaryCard[] {
  return category === 'all'
    ? [...cards]
    : cards.filter(card => card.category === category);
}

export function nextDictionaryIndex(currentIndex: number, length: number, direction: 1 | -1): number {
  if (length <= 0) return 0;
  return (currentIndex + direction + length) % length;
}

export interface DictionaryRound {
  target: DictionaryCard;
  choices: DictionaryCard[];
}

export function createDictionaryRound(
  cards: readonly DictionaryCard[],
  random: () => number = Math.random,
): DictionaryRound | null {
  if (cards.length === 0) return null;

  const targetIndex = Math.min(cards.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * cards.length));
  const target = cards[targetIndex];

  const others = cards.filter(card => card.id !== target.id);
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.max(0, Math.min(0.999999, random())) * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }

  const choiceCount = Math.min(4, cards.length);
  const choices = [target, ...others.slice(0, Math.max(0, choiceCount - 1))];
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.max(0, Math.min(0.999999, random())) * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { target, choices };
}
