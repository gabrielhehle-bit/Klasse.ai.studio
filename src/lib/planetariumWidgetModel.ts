export type SolarSystemBodyKind = 'star' | 'terrestrial' | 'gas-giant' | 'ice-giant';

export interface SolarSystemBody {
  id: string;
  name: string;
  orderFromSun: number;
  kind: SolarSystemBodyKind;
  orbitDays: number | null;
  moonCount: number | null;
  sizeEarths: number;
  appearance: string;
  shortFact: string;
  detail: string;
}

export interface PlanetariumQuizQuestion {
  id: string;
  question: string;
  options: readonly string[];
  correct: string;
  explanation: string;
}

export type PlanetariumQuizLength = 5 | 8;

export interface PlanetariumWidgetSettings {
  showMoonCounts: boolean;
  quizLength: PlanetariumQuizLength;
}

export const DEFAULT_PLANETARIUM_WIDGET_SETTINGS: PlanetariumWidgetSettings = {
  showMoonCounts: true,
  quizLength: 5,
};

export const SOLAR_SYSTEM_SOURCE_NOTE =
  'Fachbasis: NASA/IAU. Mondzahlen: Stand August 2026.';

export const SOLAR_SYSTEM_BODIES: readonly SolarSystemBody[] = [
  {
    id: 'sun',
    name: 'Sonne',
    orderFromSun: 0,
    kind: 'star',
    orbitDays: null,
    moonCount: null,
    sizeEarths: 109,
    appearance: 'radial-gradient(circle at 35% 30%, #fff7ae 0%, #facc15 35%, #f97316 72%, #c2410c 100%)',
    shortFact: 'Die Sonne ist ein Stern – kein Planet.',
    detail: 'Ihre Schwerkraft hält das Sonnensystem zusammen. Acht Planeten kreisen um sie.',
  },
  {
    id: 'mercury',
    name: 'Merkur',
    orderFromSun: 1,
    kind: 'terrestrial',
    orbitDays: 88,
    moonCount: 0,
    sizeEarths: 0.38,
    appearance: 'radial-gradient(circle at 35% 30%, #d6d3d1 0%, #78716c 58%, #44403c 100%)',
    shortFact: 'Kleinster Planet und der Sonne am nächsten.',
    detail: 'Merkur hat keine dichte Atmosphäre, sondern nur eine sehr dünne Exosphäre. Ein Merkurjahr dauert rund 88 Erdentage.',
  },
  {
    id: 'venus',
    name: 'Venus',
    orderFromSun: 2,
    kind: 'terrestrial',
    orbitDays: 224.7,
    moonCount: 0,
    sizeEarths: 0.95,
    appearance: 'radial-gradient(circle at 35% 30%, #fde68a 0%, #f59e0b 52%, #b45309 100%)',
    shortFact: 'Heißester Planet unseres Sonnensystems.',
    detail: 'Ihre sehr dichte Atmosphäre hält Wärme durch einen starken Treibhauseffekt fest. Deshalb ist Venus heißer als Merkur.',
  },
  {
    id: 'earth',
    name: 'Erde',
    orderFromSun: 3,
    kind: 'terrestrial',
    orbitDays: 365.25,
    moonCount: 1,
    sizeEarths: 1,
    appearance: 'radial-gradient(circle at 35% 30%, #bfdbfe 0%, #2563eb 48%, #14532d 71%, #0f172a 100%)',
    shortFact: 'Unser Heimatplanet.',
    detail: 'Die Erde ist der einzige Ort, an dem wir bisher sicher Leben gefunden haben. Sie besitzt einen Mond.',
  },
  {
    id: 'mars',
    name: 'Mars',
    orderFromSun: 4,
    kind: 'terrestrial',
    orbitDays: 687,
    moonCount: 2,
    sizeEarths: 0.53,
    appearance: 'radial-gradient(circle at 35% 30%, #fdba74 0%, #dc2626 58%, #7f1d1d 100%)',
    shortFact: 'Der Rote Planet.',
    detail: 'Eisenhaltige Mineralien im Boden oxidieren und lassen Mars rötlich erscheinen. Ein Marsjahr dauert 687 Erdentage.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    orderFromSun: 5,
    kind: 'gas-giant',
    orbitDays: 4333,
    moonCount: 115,
    sizeEarths: 11.21,
    appearance: 'linear-gradient(180deg, #f5deb3 0%, #b77943 22%, #f5deb3 34%, #8b5e3c 48%, #ead7bb 61%, #b77943 76%, #f5deb3 100%)',
    shortFact: 'Größter Planet des Sonnensystems.',
    detail: 'Jupiter ist ein Gasriese aus vor allem Wasserstoff und Helium. Seine vier größten Monde heißen Io, Europa, Ganymed und Kallisto.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    orderFromSun: 6,
    kind: 'gas-giant',
    orbitDays: 10759,
    moonCount: 293,
    sizeEarths: 9.45,
    appearance: 'linear-gradient(180deg, #fef3c7 0%, #d6b66f 45%, #fde68a 62%, #b08955 100%)',
    shortFact: 'Gasriese mit besonders auffälligem Ringsystem.',
    detail: 'Auch andere Riesenplaneten besitzen Ringe, aber Saturns Ringsystem ist besonders groß und deutlich. Die Ringe bestehen vor allem aus Eis- und Gesteinsteilchen.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    orderFromSun: 7,
    kind: 'ice-giant',
    orbitDays: 30687,
    moonCount: 29,
    sizeEarths: 4.01,
    appearance: 'radial-gradient(circle at 35% 30%, #d9f9ff 0%, #67e8f9 56%, #0891b2 100%)',
    shortFact: 'Eisriese, der stark auf der Seite liegt.',
    detail: 'Uranus ist um fast 98 Grad gekippt. Ein Umlauf um die Sonne dauert rund 84 Erdenjahre.',
  },
  {
    id: 'neptune',
    name: 'Neptun',
    orderFromSun: 8,
    kind: 'ice-giant',
    orbitDays: 60190,
    moonCount: 16,
    sizeEarths: 3.88,
    appearance: 'radial-gradient(circle at 35% 30%, #93c5fd 0%, #2563eb 52%, #1e3a8a 100%)',
    shortFact: 'Äußerster der acht Planeten.',
    detail: 'Neptun ist ein Eisriese mit sehr starken Winden. Ein Neptunjahr dauert ungefähr 165 Erdenjahre.',
  },
];

export const PLANETARIUM_KIND_LABELS: Record<SolarSystemBodyKind, string> = {
  star: 'Stern',
  terrestrial: 'Gesteinsplanet',
  'gas-giant': 'Gasriese',
  'ice-giant': 'Eisriese',
};

export const PLANETARIUM_QUIZ: readonly PlanetariumQuizQuestion[] = [
  {
    id: 'closest',
    question: 'Welcher Planet ist der Sonne am nächsten?',
    options: ['Venus', 'Merkur', 'Mars', 'Erde'],
    correct: 'Merkur',
    explanation: 'Merkur ist der innerste und zugleich kleinste Planet.',
  },
  {
    id: 'hottest',
    question: 'Welcher Planet ist am heißesten?',
    options: ['Merkur', 'Venus', 'Mars', 'Jupiter'],
    correct: 'Venus',
    explanation: 'Die dichte Venusatmosphäre hält durch den Treibhauseffekt besonders viel Wärme fest.',
  },
  {
    id: 'largest',
    question: 'Welcher Planet ist der größte?',
    options: ['Jupiter', 'Saturn', 'Neptun', 'Erde'],
    correct: 'Jupiter',
    explanation: 'Jupiter ist der größte Planet unseres Sonnensystems.',
  },
  {
    id: 'red',
    question: 'Welcher Planet heißt auch „Roter Planet“?',
    options: ['Mars', 'Venus', 'Merkur', 'Uranus'],
    correct: 'Mars',
    explanation: 'Eisenhaltige Mineralien lassen die Marsoberfläche rötlich erscheinen.',
  },
  {
    id: 'rings',
    question: 'Welcher Planet ist besonders für sein auffälliges Ringsystem bekannt?',
    options: ['Saturn', 'Mars', 'Venus', 'Merkur'],
    correct: 'Saturn',
    explanation: 'Alle vier Riesenplaneten haben Ringe, Saturns Ringsystem ist aber besonders auffällig.',
  },
  {
    id: 'sideways',
    question: 'Welcher Planet dreht sich beinahe „auf der Seite“?',
    options: ['Uranus', 'Neptun', 'Jupiter', 'Erde'],
    correct: 'Uranus',
    explanation: 'Die Rotationsachse von Uranus ist um fast 98 Grad gekippt.',
  },
  {
    id: 'farthest',
    question: 'Welcher der acht Planeten ist am weitesten von der Sonne entfernt?',
    options: ['Neptun', 'Saturn', 'Uranus', 'Jupiter'],
    correct: 'Neptun',
    explanation: 'Neptun ist der achte und äußerste Planet unseres Sonnensystems.',
  },
  {
    id: 'count',
    question: 'Wie viele Planeten hat unser Sonnensystem?',
    options: ['7', '8', '9', '10'],
    correct: '8',
    explanation: 'Seit der IAU-Klassifikation von 2006 zählt unser Sonnensystem acht Planeten. Pluto ist ein Zwergplanet.',
  },
];

export function normalizePlanetariumWidgetSettings(value: any): PlanetariumWidgetSettings {
  return {
    showMoonCounts:
      typeof value?.showMoonCounts === 'boolean'
        ? value.showMoonCounts
        : DEFAULT_PLANETARIUM_WIDGET_SETTINGS.showMoonCounts,
    quizLength:
      value?.quizLength === 8
        ? 8
        : DEFAULT_PLANETARIUM_WIDGET_SETTINGS.quizLength,
  };
}

export function getPlanetBodies(): SolarSystemBody[] {
  return SOLAR_SYSTEM_BODIES.filter(body => body.kind !== 'star');
}

export function getPlanetariumQuiz(length: PlanetariumQuizLength): PlanetariumQuizQuestion[] {
  return PLANETARIUM_QUIZ.slice(0, length);
}

export function formatOrbitLength(body: SolarSystemBody): string {
  if (body.orbitDays == null) return '–';
  if (body.orbitDays < 365) return Math.round(body.orbitDays) + ' Erdentage';
  const years = body.orbitDays / 365.25;
  if (years < 10) return years.toFixed(1).replace('.', ',') + ' Erdenjahre';
  return Math.round(years) + ' Erdenjahre';
}

export function planetYearsForEarthAge(earthAge: number, body: SolarSystemBody): number | null {
  if (body.orbitDays == null || body.orbitDays <= 0) return null;
  return earthAge * 365.25 / body.orbitDays;
}

export function formatPlanetYears(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(1).replace('.', ',');
  if (value >= 1) return value.toFixed(2).replace('.', ',');
  return value.toFixed(3).replace('.', ',');
}
