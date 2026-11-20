/**
 * Adaptable primary-school learning observations. These are suggested labels,
 * not an official curriculum or a new gradebook category.
 * A group is persisted in colAreas; a selected skill becomes colLabels.
 */
export interface LearningAreaGroup {
  area: string;
  skills: readonly string[];
}

const DEUTSCH: readonly LearningAreaGroup[] = [
  { area: 'Lesen', skills: ['Buchstaben und Silben lesen', 'Lesegenauigkeit', 'Leseflüssigkeit', 'Leseverständnis', 'Vorlesen'] },
  { area: 'Rechtschreibung', skills: ['Lautgetreu schreiben', 'Wörter richtig schreiben', 'Groß- und Kleinschreibung', 'Abschreiben', 'Rechtschreibstrategien'] },
  { area: 'Texte schreiben', skills: ['Sätze bilden', 'Geschichten verfassen', 'Texte planen', 'Texte überarbeiten'] },
  { area: 'Sprachbetrachtung', skills: ['Wortarten', 'Satzbau', 'Wörter und Sätze untersuchen'] },
  { area: 'Sprechen und Zuhören', skills: ['Deutlich sprechen', 'Erzählen', 'Aufmerksam zuhören', 'Gesprächsregeln'] },
];

const MATHEMATIK: readonly LearningAreaGroup[] = [
  { area: 'Zahlen und Operationen', skills: ['Zahlenverständnis', 'Zahlen vergleichen und ordnen', 'Addition und Subtraktion', 'Multiplikation und Division'] },
  { area: 'Rechnen', skills: ['Kopfrechnen', 'Rechenstrategien', 'Schriftliche Rechenverfahren'] },
  { area: 'Größen und Messen', skills: ['Geld', 'Uhrzeit und Zeitspannen', 'Längen', 'Masse und Gewicht', 'Hohlmaße'] },
  { area: 'Raum und Form', skills: ['Geometrische Formen', 'Geometrische Körper', 'Lagebeziehungen', 'Symmetrie'] },
  { area: 'Sachrechnen', skills: ['Sachaufgaben lösen', 'Rechenwege erklären', 'Informationen entnehmen'] },
  { area: 'Daten und Zufall', skills: ['Daten sammeln', 'Tabellen und Diagramme', 'Einfache Wahrscheinlichkeiten'] },
];

export function getLearningAreaGroups(subject: string): readonly LearningAreaGroup[] {
  const normalized = subject.trim().toLocaleLowerCase('de-AT');
  if (normalized.includes('deutsch')) return DEUTSCH;
  if (normalized.includes('mathematik') || normalized.includes('mathe')) return MATHEMATIK;
  return [];
}
