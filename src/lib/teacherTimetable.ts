import type { AppState } from '../types';
import { TAGE_NAMEN, LESSON_SLOT_NUMBERS } from '../constants';
import { syncActiveClass } from './appState';
import { istSekundarstufe } from './sek1Navigation';

export type Lehrerstunde = {
  klasseId: string;
  klasse: string;
  schulstufe: number;
  schulart: string;
  fach: string;
  tag: string;
  stunde: number;
};

export type Lehrerstundenplan = {
  tage: string[];
  stunden: number[];
  zeilen: Lehrerstunde[];
  konflikte: Array<{ tag: string; stunde: number; eintraege: Lehrerstunde[] }>;
  klassenAnzahl: number;
  schuljahr: string;
};

/**
 * Gesamtsicht über die eigenen Unterrichtseinsätze in der Unterstufe.
 * Keine zweite Quelle der Wahrheit: Die Stammdaten bleiben pro Klasse gespeichert.
 * Unbelegte Stunden ohne Fach sind keine Unterrichtseinsätze.
 */
export function erstelleLehrerstundenplan(app: AppState): Lehrerstundenplan {
  const snapshot = syncActiveClass(app);
  const schuljahr = snapshot.schuljahr || '';
  const klassen = (snapshot.classes || []).filter(klasse =>
    istSekundarstufe(klasse.schulart) && (klasse.schuljahr || schuljahr) === schuljahr
  );
  const stunden: Lehrerstunde[] = [];
  for (const klasse of klassen) {
    for (const tag of TAGE_NAMEN) {
      const plan = klasse.stammplan?.[tag] || {};
      const aktiveStunden = klasse.tageplan?.[tag]?.stunden;
      for (const nummer of LESSON_SLOT_NUMBERS) {
        if (Array.isArray(aktiveStunden) && !aktiveStunden.includes(nummer)) continue;
        const fach = String(plan[nummer] || '').trim();
        if (!fach) continue;
        stunden.push({
          klasseId: klasse.id, klasse: klasse.name,
          schulstufe: klasse.stufe, schulart: klasse.schulart || 'volksschule',
          fach, tag, stunde: nummer,
        });
      }
    }
  }
  const konflikte: Lehrerstundenplan['konflikte'] = [];
  for (const tag of TAGE_NAMEN) {
    for (const nummer of LESSON_SLOT_NUMBERS) {
      const eintraege = stunden.filter(e => e.tag === tag && e.stunde === nummer);
      if (eintraege.length > 1) konflikte.push({ tag, stunde: nummer, eintraege });
    }
  }
  return {
    tage: [...TAGE_NAMEN], stunden: [...LESSON_SLOT_NUMBERS], zeilen: stunden,
    konflikte, klassenAnzahl: klassen.length, schuljahr,
  };
}
