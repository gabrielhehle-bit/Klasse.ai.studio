import { normalizeSchulart, type Schulart } from './schularten';

/**
 * Sekundarstufe I: bewusst schlanke Arbeitsoberfläche, keine Löschung von Daten
 * oder Modulen. Setup, Sicherung und Einstellungen bleiben für den sicheren Betrieb erreichbar.
 * Bei Rückkehr zu einer Volksschulklasse gilt wieder die volle Modulnavigation.
 */
export const SEK1_NAVIGATION_IDS = [
  'dashboard',
  'jahresplanung',
  'wochenplanung',
  'schueler',
  'sitzplan',
  'noten',
  'anwesenheit',
  'stundenplan',
  'verhalten',
  'dossier',
  'drucken',
  'datensicherung',
  'settings',
] as const;

const SEK1_NAVIGATION_SET: ReadonlySet<string> = new Set(SEK1_NAVIGATION_IDS);

const SEK1_INTERNAL_PAGES: ReadonlySet<string> = new Set([
  'setup', 'setup_new',
  // Von älteren Dashboard-Verlinkungen erreichbare Sammelseiten werden
  // auf die passende Kernfunktion umgeleitet.
]);

export function istSekundarstufe(schulart: Schulart | string | null | undefined): boolean {
  return normalizeSchulart(schulart) !== 'volksschule';
}

export function istSek1Navigationsziel(page: string): boolean {
  return SEK1_NAVIGATION_SET.has(page);
}

export function sek1Seite(page: string, schulart: Schulart | string | null | undefined): string {
  if (!istSekundarstufe(schulart)) return page;
  if (SEK1_NAVIGATION_SET.has(page) || SEK1_INTERNAL_PAGES.has(page)) return page;
  switch (page) {
    case 'klasse': return 'schueler';
    case 'planung': return 'wochenplanung';
    case 'leistungen':
    case 'notenTabelle': return 'noten';
    case 'unterricht': return 'dashboard';
    default: return 'dashboard';
  }
}
