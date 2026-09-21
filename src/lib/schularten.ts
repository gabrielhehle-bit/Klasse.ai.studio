/**
 * Schulart ist Klassenmetadatum, keine Umrechnung aus der Klassenbezeichnung.
 * "1a" bedeutet in VS die 1., in MS/AHS-Unterstufe die 5. Schulstufe.
 * Die bisherigen Klassen ohne Schulart bleiben unverändert Volksschulklassen.
 */
export type Schulart = 'volksschule' | 'mittelschule' | 'ahs_unterstufe';

export const SCHULARTEN: ReadonlyArray<{ id: Schulart; label: string }> = [
  { id: 'volksschule', label: 'Volksschule' },
  { id: 'mittelschule', label: 'Mittelschule' },
  { id: 'ahs_unterstufe', label: 'AHS-Unterstufe (Gymnasium)' },
];

export function normalizeSchulart(value: unknown): Schulart {
  return value === 'mittelschule' || value === 'ahs_unterstufe' ? value : 'volksschule';
}

export function schulstufenFuerSchulart(schulart: Schulart): number[] {
  return schulart === 'volksschule' ? [0, 1, 2, 3, 4] : [5, 6, 7, 8];
}

export function ersteSchulstufe(schulart: Schulart): number {
  return schulart === 'volksschule' ? 1 : 5;
}

export function passendeSchulstufe(schulart: Schulart, stufe: number): number {
  return schulstufenFuerSchulart(schulart).includes(stufe) ? stufe : ersteSchulstufe(schulart);
}

export function schulstufenText(schulart: Schulart, stufe: number): string {
  if (schulart === 'volksschule') return stufe === 0 ? 'Vorschule' : `${stufe}. Schulstufe`;
  return `${stufe}. Schulstufe (${stufe - 4}. Klasse)`;
}
