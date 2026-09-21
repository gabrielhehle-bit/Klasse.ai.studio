import { FAECHER_ALLE } from '../constants';
import { istSekundarstufe } from './sek1Navigation';

/** Auswahlhilfe, keine verbindliche Stundentafel und keine automatische Fachbelegung. */
export const SEK1_FACHVORSCHLAEGE = [
  'Deutsch', 'Mathematik', 'Englisch', 'Geschichte und Politische Bildung',
  'Geografie und wirtschaftliche Bildung', 'Biologie und Umweltbildung',
  'Physik', 'Chemie', 'Digitale Grundbildung', 'Musik', 'Kunst und Gestaltung',
  'Technik und Design', 'Bewegung und Sport', 'Religion',
  'Ernährung und Haushalt', 'Zweite lebende Fremdsprache', 'Latein',
] as const;

export function faecherFuerKlasse(app: {schulart?: string | null; faecher?: string[] | null}): string[] {
  const configured = Array.isArray(app.faecher) ? app.faecher.filter(f => typeof f === 'string' && f.trim().length > 0) : [];
  if (istSekundarstufe(app.schulart)) return [...new Set(configured)];
  return FAECHER_ALLE;
}

export function fachVorschlaege(schulart: string | null | undefined): readonly string[] {
  return istSekundarstufe(schulart) ? SEK1_FACHVORSCHLAEGE : FAECHER_ALLE;
}
