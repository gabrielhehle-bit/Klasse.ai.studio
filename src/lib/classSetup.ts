import { DEFAULT_TAGEPLAN, TAGE_NAMEN } from '../constants';
import { normalizeSchulart, type Schulart } from './schularten';

export function standardKlassenrolle(schulart: Schulart | string | null | undefined): boolean {
  // Fachunterricht ist für neu angelegte Unterstufenklassen die Ausgangslage,
  // Klassenvorstand kann pro Klasse bewusst zusätzlich aktiviert werden.
  return normalizeSchulart(schulart) === 'volksschule';
}

export function leererSek1Tageplan(): typeof DEFAULT_TAGEPLAN {
  return Object.fromEntries(TAGE_NAMEN.map(tag => [tag, { vm: 0, nm: false, stunden: [] }])) as typeof DEFAULT_TAGEPLAN;
}

export function istUnveraenderterVsTageplan(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Record<string, { stunden?: number[] }>;
  return TAGE_NAMEN.every(tag =>
    Array.isArray(plan[tag]?.stunden) &&
    JSON.stringify(plan[tag].stunden) === JSON.stringify(DEFAULT_TAGEPLAN[tag]?.stunden)
  );
}

export function istLeererTageplan(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Record<string, { stunden?: number[] }>;
  return TAGE_NAMEN.every(tag => Array.isArray(plan[tag]?.stunden) && plan[tag].stunden.length === 0);
}

/** Nur ein Hinweis: aus Namen werden weder Schulstufe noch Schulart automatisch abgeleitet. */
export function abweichendeKlassenbezeichnung(name: string, schulart: Schulart, stufe: number): boolean {
  const match = name.trim().match(/^([1-4])\s*[a-zA-Z]?$/);
  if (!match) return false;
  const nameStufe = Number(match[1]);
  const expected = schulart === 'volksschule' ? stufe : stufe - 4;
  return nameStufe !== expected;
}
