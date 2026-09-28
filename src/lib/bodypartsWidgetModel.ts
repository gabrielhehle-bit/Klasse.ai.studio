export type BodypartsMode = 'explore' | 'quiz';

export interface BodyPart {
  id: 'brain' | 'lungs' | 'heart' | 'liver' | 'stomach' | 'intestines' | 'bones';
  name: string;
  emoji: string;
  x: number;
  y: number;
  role: string;
  fact: string;
  activity: string;
  quizQuestion: string;
}

export interface BodypartsWidgetSettings {
  mode: BodypartsMode;
  showFacts: boolean;
  showActivities: boolean;
}

export const BODY_PARTS: readonly BodyPart[] = [
  {
    id: 'brain',
    name: 'Gehirn',
    emoji: '🧠',
    x: 50,
    y: 22,
    role: 'Es verarbeitet Sinneseindrücke und steuert Denken, Erinnern und viele Bewegungen.',
    fact: 'Nerven leiten Signale zwischen Gehirn und Körper weiter.',
    activity: 'Merke dir drei Wörter und sage sie nach einigen Sekunden wieder auf.',
    quizQuestion: 'Welcher Körperteil verarbeitet Sinneseindrücke und steuert Denken und Erinnern?',
  },
  {
    id: 'lungs',
    name: 'Lunge',
    emoji: '🫁',
    x: 50,
    y: 52,
    role: 'Sie nimmt Sauerstoff aus der Atemluft auf und gibt Kohlendioxid wieder ab.',
    fact: 'Der Gasaustausch findet in vielen winzigen Lungenbläschen statt.',
    activity: 'Lege eine Hand auf den Bauch und beobachte, wie er sich beim ruhigen Atmen bewegt.',
    quizQuestion: 'Welches Organ versorgt den Körper beim Atmen mit Sauerstoff?',
  },
  {
    id: 'heart',
    name: 'Herz',
    emoji: '❤️',
    x: 44,
    y: 57,
    role: 'Es pumpt Blut durch den Körper und versorgt Gewebe mit Sauerstoff und Nährstoffen.',
    fact: 'Das Herz ist ein Muskel und arbeitet Tag und Nacht.',
    activity: 'Fühle deinen Puls am Handgelenk und beobachte, ob er nach Bewegung schneller wird.',
    quizQuestion: 'Welcher Muskel pumpt das Blut durch deinen Körper?',
  },
  {
    id: 'liver',
    name: 'Leber',
    emoji: '🟤',
    x: 42,
    y: 69,
    role: 'Sie verarbeitet Nährstoffe, speichert Energie und baut viele Stoffe im Körper um.',
    fact: 'Die Leber erfüllt sehr viele verschiedene Aufgaben im Stoffwechsel.',
    activity: 'Zeige auf die rechte obere Bauchseite. Dort liegt ein großer Teil der Leber.',
    quizQuestion: 'Welches Organ verarbeitet Nährstoffe und übernimmt viele Aufgaben im Stoffwechsel?',
  },
  {
    id: 'stomach',
    name: 'Magen',
    emoji: '🥣',
    x: 57,
    y: 71,
    role: 'Er sammelt Nahrung nach der Speiseröhre und vermischt sie mit Magensaft.',
    fact: 'Die Nahrung bleibt je nach Mahlzeit unterschiedlich lange im Magen.',
    activity: 'Verfolge mit dem Finger den Weg von Mund über Speiseröhre bis zum Magen.',
    quizQuestion: 'Welches Organ sammelt Nahrung und vermischt sie mit Magensaft?',
  },
  {
    id: 'intestines',
    name: 'Darm',
    emoji: '🌀',
    x: 50,
    y: 84,
    role: 'Im Dünndarm werden viele Nährstoffe aufgenommen; der Dickdarm entzieht dem Rest Wasser.',
    fact: 'Der Darm ist mehrere Meter lang und liegt in vielen Schlingen im Bauch.',
    activity: 'Zeichne mit dem Finger mehrere Schleifen auf deinen Bauch, um den Verlauf des Darms nachzuahmen.',
    quizQuestion: 'Wo werden viele Nährstoffe aus der Nahrung in den Körper aufgenommen?',
  },
  {
    id: 'bones',
    name: 'Knochen',
    emoji: '🦴',
    x: 50,
    y: 95,
    role: 'Das Skelett stützt den Körper, schützt Organe und ermöglicht zusammen mit Muskeln Bewegung.',
    fact: 'Viele Knochen treffen sich an Gelenken und können sich dort gegeneinander bewegen.',
    activity: 'Beuge vorsichtig Knie und Ellbogen und spüre, wo sich Gelenke befinden.',
    quizQuestion: 'Was stützt deinen Körper und schützt zum Beispiel Gehirn, Herz und Lunge?',
  },
] as const;

export const DEFAULT_BODYPARTS_WIDGET_SETTINGS: BodypartsWidgetSettings = {
  mode: 'explore',
  showFacts: true,
  showActivities: true,
};

export function normalizeBodypartsWidgetSettings(raw: unknown): BodypartsWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    mode: value.mode === 'quiz' ? 'quiz' : 'explore',
    showFacts: typeof value.showFacts === 'boolean' ? value.showFacts : true,
    showActivities: typeof value.showActivities === 'boolean' ? value.showActivities : true,
  };
}

export interface BodypartsQuizRound {
  target: BodyPart;
  choices: BodyPart[];
}

export function createBodypartsQuizRound(
  parts: readonly BodyPart[] = BODY_PARTS,
  random: () => number = Math.random,
): BodypartsQuizRound | null {
  if (parts.length === 0) return null;

  const targetIndex = Math.min(parts.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * parts.length));
  const target = parts[targetIndex];
  const others = parts.filter(part => part.id !== target.id);

  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.max(0, Math.min(0.999999, random())) * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }

  const choices = [target, ...others.slice(0, Math.min(3, others.length))];
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.max(0, Math.min(0.999999, random())) * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { target, choices };
}

export function getBodyPartById(id: string): BodyPart {
  return BODY_PARTS.find(part => part.id === id) || BODY_PARTS[0];
}
