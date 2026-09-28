export type WaterCycleLevel = 'basic' | 'extended';
export type WaterCycleMode = 'cycle' | 'puzzle' | 'quiz';
export type WaterCycleQuizLength = 5 | 8;

export interface WaterCycleSettings {
  level: WaterCycleLevel;
  quizLength: WaterCycleQuizLength;
}

export interface WaterCycleStage {
  id: string;
  label: string;
  icon: string;
  short: string;
  explanation: string;
  kind: 'storage' | 'movement' | 'change';
}

export interface WaterCyclePuzzlePath {
  id: string;
  title: string;
  explanation: string;
  stageIds: readonly string[];
}

export interface WaterCycleQuizQuestion {
  id: string;
  question: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  source: 'USGS' | 'NASA';
}

export const DEFAULT_WATER_CYCLE_SETTINGS: WaterCycleSettings = {
  level: 'basic',
  quizLength: 5,
};

export const WATER_CYCLE_STAGES: readonly WaterCycleStage[] = [
  {
    id: 'surface-water',
    label: 'Gewässer',
    icon: '🌊',
    short: 'Wasser wird gespeichert',
    explanation: 'Ozeane, Seen, Flüsse und andere Gewässer speichern große Mengen Wasser.',
    kind: 'storage',
  },
  {
    id: 'evaporation',
    label: 'Verdunstung',
    icon: '☀️',
    short: 'Flüssiges Wasser wird zu Wasserdampf',
    explanation: 'Sonnenenergie erwärmt Wasser. Ein Teil geht als unsichtbarer Wasserdampf in die Luft über.',
    kind: 'change',
  },
  {
    id: 'transpiration',
    label: 'Transpiration',
    icon: '🌿',
    short: 'Pflanzen geben Wasser an die Luft ab',
    explanation: 'Pflanzen geben über ihre Blätter Wasser an die Atmosphäre ab. Zusammen mit Verdunstung wird das oft als Evapotranspiration betrachtet.',
    kind: 'movement',
  },
  {
    id: 'condensation',
    label: 'Kondensation',
    icon: '☁️',
    short: 'Wasserdampf wird zu Tröpfchen oder Eis',
    explanation: 'Kühlt feuchte Luft ab, kann Wasserdampf zu winzigen Wassertröpfchen oder Eiskristallen kondensieren. So entstehen Wolken.',
    kind: 'change',
  },
  {
    id: 'precipitation',
    label: 'Niederschlag',
    icon: '🌧️',
    short: 'Wasser fällt zur Erde zurück',
    explanation: 'Wasser kehrt als Regen, Schnee, Graupel oder Hagel aus der Atmosphäre zur Erdoberfläche zurück.',
    kind: 'movement',
  },
  {
    id: 'runoff',
    label: 'Oberflächenabfluss',
    icon: '🏞️',
    short: 'Wasser fließt über die Oberfläche',
    explanation: 'Ein Teil des Niederschlags fließt über die Landoberfläche in Bäche, Flüsse, Seen und schließlich oft ins Meer.',
    kind: 'movement',
  },
  {
    id: 'infiltration',
    label: 'Versickerung',
    icon: '🟫',
    short: 'Wasser dringt in Boden und Gestein ein',
    explanation: 'Ein Teil des Niederschlags sickert in Boden und Gestein. Dieser Vorgang heißt Infiltration.',
    kind: 'movement',
  },
  {
    id: 'groundwater',
    label: 'Grundwasser',
    icon: '💧',
    short: 'Wasser bewegt sich unterirdisch',
    explanation: 'Versickertes Wasser kann Grundwasser bilden, unterirdisch fließen und später über Quellen, Flüsse oder direkt ins Meer zurückkehren.',
    kind: 'storage',
  },
] as const;

export const BASIC_WATER_CYCLE_STAGE_IDS = [
  'surface-water',
  'evaporation',
  'condensation',
  'precipitation',
  'runoff',
] as const;

export const EXTENDED_WATER_CYCLE_STAGE_IDS = [
  'surface-water',
  'evaporation',
  'transpiration',
  'condensation',
  'precipitation',
  'runoff',
  'infiltration',
  'groundwater',
] as const;

export const WATER_CYCLE_PUZZLE_PATHS: readonly WaterCyclePuzzlePath[] = [
  {
    id: 'surface',
    title: 'Oberflächenweg',
    explanation: 'Ein möglicher Weg des Wassers zurück in Flüsse, Seen und Meere.',
    stageIds: ['evaporation', 'condensation', 'precipitation', 'runoff', 'surface-water'],
  },
  {
    id: 'groundwater',
    title: 'Grundwasserweg',
    explanation: 'Ein möglicher Weg des Wassers durch Boden und Grundwasser zurück zu Gewässern.',
    stageIds: ['evaporation', 'condensation', 'precipitation', 'infiltration', 'groundwater', 'surface-water'],
  },
] as const;

export const WATER_CYCLE_QUIZ: readonly WaterCycleQuizQuestion[] = [
  {
    id: 'condensation',
    question: 'Was passiert bei der Kondensation?',
    options: [
      'Wasserdampf wird zu winzigen Wassertröpfchen oder Eiskristallen',
      'Flüssiges Wasser wird durch Wärme zu Wasserdampf',
      'Grundwasser fließt nur noch tiefer in die Erde',
    ],
    answerIndex: 0,
    explanation: 'Kondensation ist der Übergang von gasförmigem Wasser zu flüssigem Wasser; in Wolken können auch Eiskristalle entstehen.',
    source: 'USGS',
  },
  {
    id: 'clouds',
    question: 'Woraus bestehen Wolken hauptsächlich?',
    options: [
      'Aus winzigen Wassertröpfchen und/oder Eiskristallen',
      'Nur aus unsichtbarem Wasserdampf',
      'Aus Luftblasen ohne Wasser',
    ],
    answerIndex: 0,
    explanation: 'Wasserdampf selbst ist unsichtbar. Sichtbare Wolken bestehen aus sehr kleinen Wassertröpfchen und/oder Eiskristallen.',
    source: 'NASA',
  },
  {
    id: 'precipitation',
    question: 'Was kann Niederschlag sein?',
    options: [
      'Regen, Schnee, Graupel oder Hagel',
      'Nur Regen',
      'Nur Schnee und Nebel',
    ],
    answerIndex: 0,
    explanation: 'Niederschlag umfasst verschiedene Formen von Wasser, die aus der Atmosphäre zur Erdoberfläche fallen.',
    source: 'NASA',
  },
  {
    id: 'infiltration',
    question: 'Was bedeutet Versickerung oder Infiltration?',
    options: [
      'Wasser dringt in Boden und Gestein ein',
      'Wasser steigt als Dampf nach oben',
      'Wolken werden vom Wind bewegt',
    ],
    answerIndex: 0,
    explanation: 'Bei der Infiltration gelangt Wasser von der Oberfläche in Boden und Gestein und kann Grundwasser speisen.',
    source: 'USGS',
  },
  {
    id: 'runoff',
    question: 'Was ist Oberflächenabfluss?',
    options: [
      'Wasser fließt über die Landoberfläche zu Bächen, Flüssen und Seen',
      'Wasser bleibt für immer in einer Wolke',
      'Wasser wird im Boden sofort zu Eis',
    ],
    answerIndex: 0,
    explanation: 'Niederschlag, der nicht versickert oder gespeichert wird, kann über die Oberfläche abfließen.',
    source: 'USGS',
  },
  {
    id: 'groundwater',
    question: 'Kann Grundwasser wieder an die Oberfläche gelangen?',
    options: [
      'Ja, zum Beispiel über Quellen oder als Zufluss zu Flüssen und Meeren',
      'Nein, Grundwasser bleibt für immer unter der Erde',
      'Nur wenn es kocht',
    ],
    answerIndex: 0,
    explanation: 'Grundwasser bewegt sich unterirdisch und kann wieder in Quellen, Flüsse, Seen oder Meere gelangen.',
    source: 'USGS',
  },
  {
    id: 'transpiration',
    question: 'Was ist Transpiration?',
    options: [
      'Pflanzen geben Wasser über ihre Blätter an die Atmosphäre ab',
      'Fische geben Wasser an Wolken ab',
      'Regen verdunstet schon vor der Wolkenbildung',
    ],
    answerIndex: 0,
    explanation: 'Pflanzen nehmen Wasser auf und geben einen Teil davon über ihre Blätter wieder an die Atmosphäre ab.',
    source: 'USGS',
  },
  {
    id: 'cycle',
    question: 'Hat der Wasserkreislauf einen einzigen festen Anfang und ein einziges Ende?',
    options: [
      'Nein, Wasser bewegt sich ständig zwischen verschiedenen Speichern und auf verschiedenen Wegen',
      'Ja, er beginnt immer im Meer und endet immer im Meer',
      'Ja, er beginnt immer in einer Wolke',
    ],
    answerIndex: 0,
    explanation: 'Der Wasserkreislauf ist kein einziges Fließband. Wasser kann viele Wege nehmen und unterschiedlich lange in Speichern bleiben.',
    source: 'USGS',
  },
  {
    id: 'driver',
    question: 'Was treibt einen großen Teil der Verdunstung im Wasserkreislauf an?',
    options: [
      'Energie der Sonne',
      'Magnetismus der Erde',
      'Mondlicht allein',
    ],
    answerIndex: 0,
    explanation: 'Sonnenenergie liefert die Wärme, die einen großen Teil der Verdunstung antreibt. Schwerkraft bewegt Wasser anschließend unter anderem als Niederschlag und Abfluss.',
    source: 'NASA',
  },
  {
    id: 'branching',
    question: 'Was kann nach einem Niederschlag auf dem Land passieren?',
    options: [
      'Ein Teil fließt oberirdisch ab, ein Teil versickert und ein Teil wird gespeichert',
      'Alles Wasser fließt sofort direkt ins Meer',
      'Alles Wasser verdunstet sofort wieder',
    ],
    answerIndex: 0,
    explanation: 'Nach Niederschlag kann Wasser verschiedene Wege nehmen. Genau deshalb ist der Wasserkreislauf ein Netzwerk und keine einzige starre Reihenfolge.',
    source: 'USGS',
  },
] as const;

export function normalizeWaterCycleSettings(raw: unknown): WaterCycleSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    level: value.level === 'extended' ? 'extended' : 'basic',
    quizLength: value.quizLength === 8 ? 8 : 5,
  };
}

export function getWaterCycleStages(level: WaterCycleLevel): readonly WaterCycleStage[] {
  const ids = level === 'extended'
    ? EXTENDED_WATER_CYCLE_STAGE_IDS
    : BASIC_WATER_CYCLE_STAGE_IDS;
  return ids.map(id => WATER_CYCLE_STAGES.find(stage => stage.id === id)!).filter(Boolean);
}

function clampRandom(value: number): number {
  return Math.max(0, Math.min(0.999999, value));
}

export function shuffleWaterCycleItems<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clampRandom(random()) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createWaterCyclePuzzle(
  level: WaterCycleLevel,
  random: () => number = Math.random,
): WaterCyclePuzzlePath {
  if (level === 'basic') return WATER_CYCLE_PUZZLE_PATHS[0];
  return WATER_CYCLE_PUZZLE_PATHS[
    Math.floor(clampRandom(random()) * WATER_CYCLE_PUZZLE_PATHS.length)
  ];
}

export function createWaterCycleQuiz(
  length: WaterCycleQuizLength,
  random: () => number = Math.random,
): WaterCycleQuizQuestion[] {
  return shuffleWaterCycleItems(WATER_CYCLE_QUIZ, random).slice(0, length);
}

export function getWaterCycleStage(id: string): WaterCycleStage {
  const stage = WATER_CYCLE_STAGES.find(item => item.id === id);
  if (!stage) throw new Error(`Unknown water-cycle stage: ${id}`);
  return stage;
}
