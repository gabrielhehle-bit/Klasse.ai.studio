/**
 * Reines, zustandsloses Logik- und Datenmodell für das Widget "Schnelllinks & Materialien" (widget-links)
 * 100 % offline, frei von KI, frei von Schülertracking, strikte URL-Validierung gegen Injection.
 */

export type LinkCategory = 'web' | 'exercise' | 'video' | 'book' | 'worksheet' | 'padlet';

export interface UnterrichtsLink {
  id: string;
  title: string;
  url: string;
  category?: LinkCategory;
  iconEmoji?: string;
  description?: string;
}

export interface LinksWidgetState {
  links: UnterrichtsLink[];
  lastUpdated?: string;
}

export const LINK_CATEGORIES: Array<{ id: LinkCategory; label: string; defaultEmoji: string }> = [
  { id: 'web', label: 'Website', defaultEmoji: '🌐' },
  { id: 'exercise', label: 'Übung / Spiel', defaultEmoji: '🧩' },
  { id: 'video', label: 'Video', defaultEmoji: '🎬' },
  { id: 'book', label: 'Buch / Text', defaultEmoji: '📘' },
  { id: 'worksheet', label: 'Arbeitsblatt', defaultEmoji: '📄' },
  { id: 'padlet', label: 'Pinnwand', defaultEmoji: '📌' },
];

export const LINK_EMOJI_PALETTE = [
  '🌐', '🧩', '🎬', '📘', '📄', '📌', '💻', '🔍', '🎧', '📐', '🧪', '🌍', '🎨', '✏️', '⭐', '🔗'
];

/**
 * Validiert URLs nach strengen Sicherheitskriterien:
 * - Erlaubt nur http://, https:// oder relative interne Pfade (/...)
 * - Blockiert strikt gefährliche Schemes: javascript:, data:, vbscript:, file: etc.
 */
export function isAllowedUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  // Gefährliche Schemes strikt abweisen
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.includes('<script') ||
    lower.includes('javascript&colon;')
  ) {
    return false;
  }

  // Relative interne Pfade erlauben
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return true;
  }

  // Wenn ein Scheme (: oder ://) vorhanden ist
  if (trimmed.includes(':')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // Domain ohne Protocol (z. B. "anton.app", "schule.at/mathe")
  try {
    const parsed = new URL(`https://${trimmed}`);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Normalisiert eine eingegebene URL (fügt bei Bedarf https:// hinzu)
 */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Standard-Vorschläge für Unterrichts-Materialien
 */
export const DEFAULT_SAMPLE_LINKS: UnterrichtsLink[] = [
  {
    id: 'link-sample-1',
    title: 'Mathe-Onlineübung',
    url: 'https://anton.app',
    category: 'exercise',
    iconEmoji: '🧩',
  },
  {
    id: 'link-sample-2',
    title: 'Lesetext des Tages',
    url: 'https://lesefit.at',
    category: 'book',
    iconEmoji: '📘',
  },
  {
    id: 'link-sample-3',
    title: 'Erklärvideo',
    url: 'https://zdf.de/kinder/logo',
    category: 'video',
    iconEmoji: '🎬',
  },
];

/**
 * Migriert bestehende Daten (z. B. app.quickLinks oder alte Widget-States)
 * Idempotent, stabil und dedupliziert.
 */
export function migrateLegacyLinks(existingData: any): UnterrichtsLink[] {
  if (!existingData) return [];

  let rawList: any[] = [];
  if (Array.isArray(existingData)) {
    rawList = existingData;
  } else if (existingData.links && Array.isArray(existingData.links)) {
    rawList = existingData.links;
  } else if (existingData.quickLinks && Array.isArray(existingData.quickLinks)) {
    rawList = existingData.quickLinks;
  }

  const result: UnterrichtsLink[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  rawList.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const title = (item.title || item.titel || item.label || `Link ${idx + 1}`).trim();
    const rawUrl = (item.url || item.href || '').trim();

    if (!isAllowedUrl(rawUrl)) return;

    const normalizedUrl = normalizeUrl(rawUrl);
    // Deduplizieren nach URL (verhindert doppelte Links)
    if (seenUrls.has(normalizedUrl.toLowerCase())) return;

    const id = item.id ? String(item.id) : `link-migrated-${idx + 1}`;
    // Eindeutige ID sicherstellen
    let uniqueId = id;
    let counter = 1;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${id}-${counter++}`;
    }

    seenIds.add(uniqueId);
    seenUrls.add(normalizedUrl.toLowerCase());

    const category = item.category || 'web';
    const iconEmoji = item.iconEmoji || item.emoji || '🌐';

    result.push({
      id: uniqueId,
      title,
      url: normalizedUrl,
      category,
      iconEmoji,
      description: item.description ? String(item.description).trim() : undefined,
    });
  });

  return result;
}

/**
 * Kanonische Datenquelle für ein LinksWidget auflösen:
 * 1. Kanonische Quelle: widgetSettings.linksState.links oder widgetSettings.links
 *    - Wenn dieses Array definiert ist (auch leeres Array []), ist das Widget bereits initialisiert.
 *    - app.quickLinks wird NICHT ausgelesen.
 * 2. Einmalige Legacy-Migration:
 *    - Nur wenn widgetSettings weder linksState noch links enthält, wird app.quickLinks einmalig übernommen.
 * 3. Fallback: DEFAULT_SAMPLE_LINKS.
 */
export function resolveCanonicalWidgetLinks(
  widgetSettings?: any,
  legacyAppQuickLinks?: any
): { links: UnterrichtsLink[]; shouldPersistMigration: boolean } {
  // 1. Kanonische Quelle im Widget prüfen
  const existingLinks = widgetSettings?.linksState?.links ?? widgetSettings?.links;
  if (Array.isArray(existingLinks)) {
    return {
      links: migrateLegacyLinks(existingLinks),
      shouldPersistMigration: false,
    };
  }

  // 2. Einmalige Legacy-Migration aus app.quickLinks
  if (legacyAppQuickLinks && Array.isArray(legacyAppQuickLinks) && legacyAppQuickLinks.length > 0) {
    const migrated = migrateLegacyLinks(legacyAppQuickLinks);
    if (migrated.length > 0) {
      return {
        links: migrated,
        shouldPersistMigration: true,
      };
    }
  }

  // 3. Fallback auf Standard-Unterrichtsbeispiele
  return {
    links: DEFAULT_SAMPLE_LINKS,
    shouldPersistMigration: true,
  };
}

/**
 * Neuen Link hinzufügen
 */
export function addLink(
  links: UnterrichtsLink[],
  input: { title: string; url: string; category?: LinkCategory; iconEmoji?: string; description?: string }
): { success: boolean; links: UnterrichtsLink[]; error?: string } {
  const cleanTitle = input.title ? input.title.trim() : '';
  if (!cleanTitle) {
    return { success: false, links, error: 'Titel darf nicht leer sein.' };
  }

  if (!isAllowedUrl(input.url)) {
    return { success: false, links, error: 'Ungültige oder unsichere URL (nur https://, http:// oder /... erlaubt).' };
  }

  const category = input.category || 'web';
  const matchingCat = LINK_CATEGORIES.find((c) => c.id === category);
  const defaultEmoji = matchingCat ? matchingCat.defaultEmoji : '🌐';

  const newLink: UnterrichtsLink = {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanTitle,
    url: normalizeUrl(input.url),
    category,
    iconEmoji: input.iconEmoji || defaultEmoji,
    description: input.description ? input.description.trim() : undefined,
  };

  return {
    success: true,
    links: [...links, newLink],
  };
}

/**
 * Link bearbeiten
 */
export function editLink(
  links: UnterrichtsLink[],
  id: string,
  updates: Partial<Omit<UnterrichtsLink, 'id'>>
): { success: boolean; links: UnterrichtsLink[]; error?: string } {
  const existing = links.find((l) => l.id === id);
  if (!existing) {
    return { success: false, links, error: 'Link nicht gefunden.' };
  }

  if (updates.url !== undefined && !isAllowedUrl(updates.url)) {
    return { success: false, links, error: 'Ungültige oder unsichere URL.' };
  }

  const updatedLinks = links.map((link) => {
    if (link.id !== id) return link;
    return {
      ...link,
      title: updates.title !== undefined ? updates.title.trim() : link.title,
      url: updates.url !== undefined ? normalizeUrl(updates.url) : link.url,
      category: updates.category !== undefined ? updates.category : link.category,
      iconEmoji: updates.iconEmoji !== undefined ? updates.iconEmoji : link.iconEmoji,
      description: updates.description !== undefined ? updates.description?.trim() : link.description,
    };
  });

  return { success: true, links: updatedLinks };
}

/**
 * Link löschen
 */
export function deleteLink(links: UnterrichtsLink[], id: string): UnterrichtsLink[] {
  return links.filter((l) => l.id !== id);
}

/**
 * Reihenfolge verschieben (nach oben oder unten)
 */
export function moveLink(
  links: UnterrichtsLink[],
  index: number,
  direction: 'up' | 'down'
): UnterrichtsLink[] {
  if (index < 0 || index >= links.length) return links;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= links.length) return links;

  const copy = [...links];
  const item = copy[index];
  copy[index] = copy[targetIndex];
  copy[targetIndex] = item;
  return copy;
}

/**
 * Sichere Parameter für externes Öffnen
 */
export const SECURE_LINK_ATTRIBUTES = {
  target: '_blank',
  rel: 'noopener noreferrer',
};

/**
 * Prüft, ob Schülertracking oder Schülerdaten an URLs angehängt wurden
 */
export function hasNoStudentTracking(links: UnterrichtsLink[]): boolean {
  return links.every((link) => {
    const urlLower = link.url.toLowerCase();
    const trackingParams = ['schuelerid=', 'studentid=', 'name=', 'klasse=', 'token=', 'track='];
    const hasForbiddenParams = trackingParams.some((param) => urlLower.includes(param));
    const asAny = link as any;
    const hasTrackingFields =
      asAny.clickCount !== undefined ||
      asAny.studentClicks !== undefined ||
      asAny.history !== undefined ||
      asAny.openedBy !== undefined;
    return !hasForbiddenParams && !hasTrackingFields;
  });
}

/**
 * Responsive-Kategorie
 */
export type LinksResponsiveCategory = 'compact' | 'standard' | 'large' | 'fullscreen';

export function getLinksResponsiveCategory(
  width: number,
  isFullscreen = false
): LinksResponsiveCategory {
  if (isFullscreen || width >= 800) return 'fullscreen';
  if (width >= 550) return 'large';
  if (width >= 380) return 'standard';
  return 'compact';
}
