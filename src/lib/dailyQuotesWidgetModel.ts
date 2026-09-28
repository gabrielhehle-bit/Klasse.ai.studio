export type DailyQuoteTheme = 'mixed' | 'learning' | 'courage' | 'team' | 'calm' | 'kindness';

export interface DailyQuote {
  id: string;
  theme: Exclude<DailyQuoteTheme, 'mixed'>;
  title: string;
  text: string;
}

export interface DailyQuotesWidgetSettings {
  theme: DailyQuoteTheme;
  currentQuoteId: string;
  customTitle: string;
  customText: string;
  useCustom: boolean;
}

export const DAILY_QUOTE_THEME_LABELS: Record<DailyQuoteTheme, string> = {
  mixed: 'Gemischt',
  learning: 'Lernen & Fehler',
  courage: 'Mut',
  team: 'Miteinander',
  calm: 'Ruhe & Fokus',
  kindness: 'Freundlichkeit',
};

export const DAILY_QUOTES: readonly DailyQuote[] = [
  {
    id: 'learning-next-step',
    theme: 'learning',
    title: '💡 Fehler helfen',
    text: 'Ein Fehler zeigt dir, was du als Nächstes ausprobieren kannst.',
  },
  {
    id: 'learning-curious',
    theme: 'learning',
    title: '🔎 Neugierig bleiben',
    text: 'Eine gute Frage kann heute wichtiger sein als eine schnelle Antwort.',
  },
  {
    id: 'courage-small-step',
    theme: 'courage',
    title: '🌱 Schritt für Schritt',
    text: 'Du musst nicht alles sofort können. Ein kleiner Schritt reicht für heute.',
  },
  {
    id: 'courage-try',
    theme: 'courage',
    title: '🚀 Trau dich',
    text: 'Probier etwas aus, auch wenn du noch nicht weißt, ob es klappt.',
  },
  {
    id: 'team-listen',
    theme: 'team',
    title: '🤝 Gemeinsam',
    text: 'Hört einander zu und helft euch, wenn jemand feststeckt.',
  },
  {
    id: 'team-ideas',
    theme: 'team',
    title: '🧩 Viele Ideen',
    text: 'Verschiedene Gedanken können zusammen eine richtig gute Lösung ergeben.',
  },
  {
    id: 'calm-breathe',
    theme: 'calm',
    title: '🍃 Kurz sammeln',
    text: 'Atme ruhig ein und aus. Dann entscheide, was dein nächster Schritt ist.',
  },
  {
    id: 'calm-one-thing',
    theme: 'calm',
    title: '🎯 Eins nach dem anderen',
    text: 'Konzentriere dich zuerst auf eine Sache. Danach kommt die nächste.',
  },
  {
    id: 'kindness-help',
    theme: 'kindness',
    title: '☀️ Freundlich handeln',
    text: 'Ein ehrliches Danke oder eine kleine Hilfe kann den Tag leichter machen.',
  },
  {
    id: 'kindness-respect',
    theme: 'kindness',
    title: '💛 Respekt zeigen',
    text: 'Sprich so mit anderen, wie du selbst gerne angesprochen werden möchtest.',
  },
] as const;

export const DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS: DailyQuotesWidgetSettings = {
  theme: 'mixed',
  currentQuoteId: DAILY_QUOTES[0].id,
  customTitle: '',
  customText: '',
  useCustom: false,
};

const THEME_KEYS = new Set<DailyQuoteTheme>(Object.keys(DAILY_QUOTE_THEME_LABELS) as DailyQuoteTheme[]);

export function normalizeDailyQuotesWidgetSettings(raw: unknown): DailyQuotesWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const theme = typeof value.theme === 'string' && THEME_KEYS.has(value.theme as DailyQuoteTheme)
    ? value.theme as DailyQuoteTheme
    : DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS.theme;
  const currentQuoteId = typeof value.currentQuoteId === 'string' && value.currentQuoteId.trim()
    ? value.currentQuoteId
    : DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS.currentQuoteId;
  const customTitle = typeof value.customTitle === 'string' ? value.customTitle.trim().slice(0, 60) : '';
  const customText = typeof value.customText === 'string' ? value.customText.trim().slice(0, 220) : '';
  const useCustom = value.useCustom === true && Boolean(customText);
  return { theme, currentQuoteId, customTitle, customText, useCustom };
}

export function getDailyQuotesForTheme(theme: DailyQuoteTheme): DailyQuote[] {
  if (theme === 'mixed') return [...DAILY_QUOTES];
  return DAILY_QUOTES.filter(quote => quote.theme === theme);
}

export function getNextDailyQuoteId(currentId: string, theme: DailyQuoteTheme): string {
  const quotes = getDailyQuotesForTheme(theme);
  if (quotes.length === 0) return DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS.currentQuoteId;
  const currentIndex = quotes.findIndex(quote => quote.id === currentId);
  return quotes[(currentIndex + 1 + quotes.length) % quotes.length].id;
}

export function getActiveDailyQuote(settings: DailyQuotesWidgetSettings): { title: string; text: string; custom: boolean } {
  if (settings.useCustom && settings.customText) {
    return {
      title: settings.customTitle || '💬 Unser Motto',
      text: settings.customText,
      custom: true,
    };
  }

  const quotes = getDailyQuotesForTheme(settings.theme);
  const quote = quotes.find(item => item.id === settings.currentQuoteId)
    || quotes[0]
    || DAILY_QUOTES[0];
  return { title: quote.title, text: quote.text, custom: false };
}

function cleanAiPart(value: string, maxLength: number): string {
  return value
    .replace(/^\s*[#>*"'\x60]+\s*/g, '')
    .replace(/\s*[>*"'\x60]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function parseAiDailyQuote(response: unknown): { title: string; text: string } | null {
  if (typeof response !== 'string') return null;
  const normalized = response.replace(/\r/g, '').trim();
  const separator = normalized.indexOf(';');
  if (separator <= 0 || separator >= normalized.length - 1) return null;

  const title = cleanAiPart(normalized.slice(0, separator), 60);
  const text = cleanAiPart(normalized.slice(separator + 1), 220);
  if (!title || !text) return null;
  return { title, text };
}
