export type TrafficQuizCategory = 'all' | 'signs' | 'priority' | 'cycling' | 'safety';
export type TrafficQuizExamLength = 5 | 10;

export interface TrafficQuizSettings {
  category: TrafficQuizCategory;
  examLength: TrafficQuizExamLength;
  readAloud: boolean;
}

export interface TrafficQuizQuestion {
  id: string;
  title: string;
  category: Exclude<TrafficQuizCategory, 'all'>;
  visual:
    | 'halt'
    | 'give-way'
    | 'priority-road'
    | 'no-entry'
    | 'bike-ban'
    | 'cycle-path-required'
    | 'cycle-path-optional'
    | 'one-way'
    | 'crosswalk'
    | 'cycle-crossing'
    | 'right-priority'
    | 'roundabout'
    | 'hand-signal'
    | 'helmet'
    | 'phone'
    | 'blind-spot';
  question: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  source: string;
}

export const TRAFFIC_QUIZ_CATEGORY_LABELS: Record<TrafficQuizCategory, string> = {
  all: 'Alle Themen',
  signs: 'Verkehrszeichen',
  priority: 'Vorrang',
  cycling: 'Radfahrregeln',
  safety: 'Sicherheit',
};

export const DEFAULT_TRAFFIC_QUIZ_SETTINGS: TrafficQuizSettings = {
  category: 'all',
  examLength: 5,
  readAloud: true,
};

/**
 * Österreichische Radfahr- und Verkehrsfragen.
 * Rechtsstand der inhaltlichen Prüfung: September 2026.
 * Grundlage: österreichische StVO 1960 (RIS) und ergänzende ÖAMTC-Erklärungen.
 */
export const TRAFFIC_QUIZ_QUESTIONS: readonly TrafficQuizQuestion[] = [
  {
    id: 'halt',
    title: 'HALT',
    category: 'signs',
    visual: 'halt',
    question: 'Was ordnet das Verkehrszeichen „HALT“ an?',
    options: [
      'Anhalten und anschließend Vorrang geben',
      'Nur langsamer werden',
      'Nur anhalten, wenn Querverkehr sichtbar ist',
    ],
    answerIndex: 0,
    explanation: 'Bei „HALT“ musst du anhalten und anschließend den anderen Verkehrsteilnehmern den vorgeschriebenen Vorrang geben.',
    source: 'StVO § 52 Z 24',
  },
  {
    id: 'give-way',
    title: 'VORRANG GEBEN',
    category: 'priority',
    visual: 'give-way',
    question: 'Was bedeutet das umgedrehte Dreieck „VORRANG GEBEN“?',
    options: [
      'Ich muss dem bevorrechtigten Verkehr Vorrang geben',
      'Ich habe automatisch Vorrang',
      'Ich muss immer vollständig anhalten',
    ],
    answerIndex: 0,
    explanation: 'Das Zeichen verpflichtet zum Vorranggeben. Vollständig anhalten musst du nur, wenn es die Verkehrslage erfordert oder „HALT“ angeordnet ist.',
    source: 'StVO § 52 Z 23',
  },
  {
    id: 'priority-road',
    title: 'VORRANGSTRASSE',
    category: 'priority',
    visual: 'priority-road',
    question: 'Was zeigt die gelbe Raute „VORRANGSTRASSE“ an?',
    options: [
      'Beginn und Verlauf einer Vorrangstraße',
      'Beginn einer Tempo-30-Zone',
      'Eine Straße nur für Fahrräder',
    ],
    answerIndex: 0,
    explanation: 'Die gelbe Raute kennzeichnet Beginn und Verlauf einer Vorrangstraße.',
    source: 'StVO § 52 Z 25a',
  },
  {
    id: 'no-entry',
    title: 'EINFAHRT VERBOTEN',
    category: 'signs',
    visual: 'no-entry',
    question: 'Was bedeutet der rote Kreis mit weißem Querbalken?',
    options: [
      'Einfahrt verboten',
      'Parken verboten',
      'Nur Fahrräder dürfen einfahren',
    ],
    answerIndex: 0,
    explanation: 'Das Zeichen bedeutet schlicht: Einfahrt verboten. Zusatztafeln können Ausnahmen festlegen.',
    source: 'StVO § 52 Z 2',
  },
  {
    id: 'bike-ban',
    title: 'FAHRVERBOT FÜR FAHRRÄDER',
    category: 'signs',
    visual: 'bike-ban',
    question: 'Was gilt beim Verkehrszeichen „FAHRVERBOT FÜR FAHRRÄDER“?',
    options: [
      'Radfahren ist verboten, Schieben ist erlaubt',
      'Radfahren ist erlaubt, aber nur langsam',
      'Auch das Schieben eines Fahrrads ist verboten',
    ],
    answerIndex: 0,
    explanation: 'Mit dem Fahrrad darfst du dort nicht fahren. Das Schieben des Fahrrads ist ausdrücklich erlaubt.',
    source: 'StVO § 52 Z 8c',
  },
  {
    id: 'cycle-path-required',
    title: 'RADWEG',
    category: 'cycling',
    visual: 'cycle-path-required',
    question: 'Was bedeutet das runde blaue Radweg-Zeichen?',
    options: [
      'Einspurige Fahrräder müssen diesen Radweg benützen',
      'Der Radweg darf benutzt werden, muss aber nicht',
      'Der Weg ist nur zum Abstellen von Fahrrädern',
    ],
    answerIndex: 0,
    explanation: 'Das runde Gebotszeichen „RADWEG“ bedeutet Benützungspflicht für einspurige Fahrräder.',
    source: 'StVO § 52 Z 16',
  },
  {
    id: 'cycle-path-optional',
    title: 'RADWEG OHNE BENÜTZUNGSPFLICHT',
    category: 'cycling',
    visual: 'cycle-path-optional',
    question: 'Was bedeutet das eckige blaue Radweg-Zeichen?',
    options: [
      'Der Radweg darf benutzt werden, muss aber nicht',
      'Der Radweg muss immer benutzt werden',
      'Fahrräder sind auf diesem Weg verboten',
    ],
    answerIndex: 0,
    explanation: 'Das eckige Hinweiszeichen kennzeichnet einen Radweg ohne Benützungspflicht.',
    source: 'StVO § 53 Z 27',
  },
  {
    id: 'one-way',
    title: 'EINBAHNSTRASSE',
    category: 'signs',
    visual: 'one-way',
    question: 'Was zeigt das Hinweiszeichen „EINBAHNSTRASSE“ an?',
    options: [
      'Die zulässige Fahrtrichtung der Einbahnstraße',
      'Eine Straße ohne Vorrang',
      'Eine Straße nur für Fußgänger',
    ],
    answerIndex: 0,
    explanation: 'Das Zeichen weist in die zulässige Fahrtrichtung. Für Radfahrer kann eine Ausnahme durch Zusatzbeschilderung bestehen.',
    source: 'StVO § 53 Z 10',
  },
  {
    id: 'crosswalk',
    title: 'SCHUTZWEG',
    category: 'cycling',
    visual: 'crosswalk',
    question: 'Du willst mit dem Fahrrad einen Schutzweg („Zebrastreifen“) benutzen. Was ist richtig?',
    options: [
      'Absteigen und das Fahrrad als Fußgänger schieben',
      'Mit dem Fahrrad schnell darüberfahren',
      'Auf dem Fahrrad bleiben, denn Radfahrer haben dort immer Vorrang',
    ],
    answerIndex: 0,
    explanation: 'Ein Schutzweg ist für Fußgänger bestimmt. Radfahren auf dem Schutzweg ist nicht erlaubt; schiebend bist du Fußgänger.',
    source: 'StVO § 2 Abs. 1 Z 12; ÖAMTC Radfahrregeln',
  },
  {
    id: 'cycle-crossing',
    title: 'RADFAHRERÜBERFAHRT',
    category: 'cycling',
    visual: 'cycle-crossing',
    question: 'Wie schnell darfst du dich einer ungeregelten Radfahrerüberfahrt grundsätzlich höchstens nähern?',
    options: [
      '10 km/h',
      '20 km/h',
      '30 km/h',
    ],
    answerIndex: 0,
    explanation: 'Bei einer ungeregelten Radfahrerüberfahrt gilt grundsätzlich höchstens 10 km/h Annäherungsgeschwindigkeit. Eine gesetzliche Ausnahme besteht, wenn in unmittelbarer Nähe aktuell keine Kraftfahrzeuge fahren.',
    source: 'StVO § 68 Abs. 3a',
  },
  {
    id: 'right-priority',
    title: 'RECHTSREGEL',
    category: 'priority',
    visual: 'right-priority',
    question: 'Keine Ampel, kein Vorrangzeichen und keine besondere Regelung: Was gilt grundsätzlich?',
    options: [
      'Der von rechts kommende Verkehr hat Vorrang',
      'Fahrräder haben immer Vorrang',
      'Wer zuerst an der Kreuzung ist, fährt immer zuerst',
    ],
    answerIndex: 0,
    explanation: 'An einer ungeregelten Kreuzung gilt grundsätzlich der Rechtsvorrang, sofern keine besondere Regelung greift.',
    source: 'StVO § 19; ÖAMTC Radfahrregeln',
  },
  {
    id: 'roundabout',
    title: 'KREISVERKEHR',
    category: 'priority',
    visual: 'roundabout',
    question: 'Wer hat in Österreich im Kreisverkehr automatisch Vorrang?',
    options: [
      'Niemand automatisch – die Beschilderung entscheidet',
      'Immer die Fahrzeuge im Kreis',
      'Immer die Fahrzeuge, die in den Kreis einfahren',
    ],
    answerIndex: 0,
    explanation: 'Ein Kreisverkehr wird grundsätzlich wie eine Kreuzung behandelt. Meist steht vor der Einfahrt „VORRANG GEBEN“; dann hat der Verkehr im Kreis Vorrang. Ohne solche Beschilderung gilt grundsätzlich die Rechtsregel.',
    source: 'StVO § 19; ÖAMTC „Richtiges Verhalten im Kreisverkehr“',
  },
  {
    id: 'hand-signal',
    title: 'HANDZEICHEN',
    category: 'safety',
    visual: 'hand-signal',
    question: 'Was musst du vor einer Fahrtrichtungsänderung mit dem Fahrrad tun?',
    options: [
      'Prüfen, ob es sicher ist, und die Änderung rechtzeitig deutlich anzeigen',
      'Nur klingeln',
      'Ohne Zeichen möglichst schnell abbiegen',
    ],
    answerIndex: 0,
    explanation: 'Eine Fahrtrichtungsänderung darf nur ohne Gefährdung anderer erfolgen und muss rechtzeitig angezeigt werden. Beim Fahrrad geschieht das durch ein deutliches Handzeichen.',
    source: 'StVO § 11 Abs. 1–3',
  },
  {
    id: 'helmet',
    title: 'FAHRRADHELM',
    category: 'safety',
    visual: 'helmet',
    question: 'Für wen besteht beim Radfahren in Österreich gesetzliche Helmpflicht?',
    options: [
      'Für Kinder unter 12 Jahren',
      'Für alle Radfahrer jeden Alters',
      'Nur für Erwachsene über 18 Jahren',
    ],
    answerIndex: 0,
    explanation: 'Kinder unter 12 Jahren müssen beim Radfahren einen Sturzhelm bestimmungsgemäß tragen. Unabhängig vom Alter ist ein Helm eine wichtige Schutzmaßnahme.',
    source: 'StVO § 68 Abs. 6',
  },
  {
    id: 'phone',
    title: 'TELEFONIEREN',
    category: 'safety',
    visual: 'phone',
    question: 'Darfst du während des Radfahrens mit dem Handy telefonieren?',
    options: [
      'Nur mit einer zulässigen Freisprecheinrichtung',
      'Ja, wenn ich langsam fahre',
      'Ja, solange ich eine Hand am Lenker habe',
    ],
    answerIndex: 0,
    explanation: 'Telefonieren während des Radfahrens ist ohne Freisprecheinrichtung verboten.',
    source: 'StVO § 68 Abs. 3 lit. e',
  },
  {
    id: 'blind-spot',
    title: 'TOTER WINKEL',
    category: 'safety',
    visual: 'blind-spot',
    question: 'Warum ist der Bereich neben einem rechts abbiegenden Lkw besonders gefährlich?',
    options: [
      'Du kannst trotz Spiegeln für den Fahrer schwer oder gar nicht sichtbar sein',
      'Weil dort Fahrräder grundsätzlich verboten sind',
      'Weil Lkw beim Abbiegen immer rückwärts fahren',
    ],
    answerIndex: 0,
    explanation: 'Bleib mit dem Fahrrad hinter großen Fahrzeugen und halte Abstand. Beim Abbiegen können Bereiche neben dem Fahrzeug schlecht einsehbar sein.',
    source: 'Verkehrssicherheits-Grundregel; ÖAMTC',
  },
];

export function normalizeTrafficQuizSettings(raw: unknown): TrafficQuizSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const categories: TrafficQuizCategory[] = ['all', 'signs', 'priority', 'cycling', 'safety'];
  return {
    category: categories.includes(value.category as TrafficQuizCategory)
      ? value.category as TrafficQuizCategory
      : 'all',
    examLength: value.examLength === 10 ? 10 : 5,
    readAloud: typeof value.readAloud === 'boolean' ? value.readAloud : true,
  };
}

export function filterTrafficQuizQuestions(
  category: TrafficQuizCategory,
): readonly TrafficQuizQuestion[] {
  return category === 'all'
    ? TRAFFIC_QUIZ_QUESTIONS
    : TRAFFIC_QUIZ_QUESTIONS.filter(question => question.category === category);
}

function clampRandom(value: number): number {
  return Math.max(0, Math.min(0.999999, value));
}

export function shuffleTrafficQuizQuestions(
  questions: readonly TrafficQuizQuestion[],
  random: () => number = Math.random,
): TrafficQuizQuestion[] {
  const result = [...questions];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clampRandom(random()) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createTrafficPracticeQuestion(
  category: TrafficQuizCategory,
  random: () => number = Math.random,
  previousId?: string,
): TrafficQuizQuestion {
  const pool = filterTrafficQuizQuestions(category);
  const eligible = previousId && pool.length > 1
    ? pool.filter(question => question.id !== previousId)
    : pool;
  return eligible[Math.floor(clampRandom(random()) * eligible.length)];
}

export function createTrafficExam(
  settings: TrafficQuizSettings,
  random: () => number = Math.random,
): TrafficQuizQuestion[] {
  const pool = filterTrafficQuizQuestions(settings.category);
  return shuffleTrafficQuizQuestions(pool, random).slice(0, Math.min(settings.examLength, pool.length));
}

export function hasPassedTrafficPracticeExam(correct: number, total: number): boolean {
  return total > 0 && correct / total >= 0.8;
}
