export type BodyPartsMode = 'explore' | 'find';

export interface BodyOrgan {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  functionText: string;
  fact: string;
  activity: string;
  quizQuestion: string;
}

export interface BodyPartsWidgetSettings {
  mode: BodyPartsMode;
  showFacts: boolean;
  showActivities: boolean;
}

export const BODY_ORGANS: readonly BodyOrgan[] = [
  {
    id: 'brain',
    name: 'Gehirn',
    emoji: '🧠',
    x: 50,
    y: 15,
    functionText: 'Es verarbeitet Sinneseindrücke und hilft beim Denken, Erinnern, Fühlen und Steuern von Bewegungen.',
    fact: 'Gehirn, Rückenmark und Nerven arbeiten als großes Nachrichtennetz zusammen.',
    activity: 'Schließe kurz die Augen und nenne drei Geräusche, die dein Gehirn gerade verarbeitet.',
    quizQuestion: 'Welches Organ verarbeitet Sinneseindrücke und steuert viele Bewegungen?',
  },
  {
    id: 'lungs',
    name: 'Lunge',
    emoji: '🫁',
    x: 50,
    y: 37,
    functionText: 'Sie nimmt Sauerstoff aus der Luft auf und gibt Kohlendioxid wieder ab.',
    fact: 'Die rechte und die linke Lunge teilen sich den Platz im Brustkorb mit dem Herzen.',
    activity: 'Lege eine Hand auf den Brustkorb und spüre, wie er sich beim ruhigen Atmen hebt und senkt.',
    quizQuestion: 'Welches Organ tauscht Sauerstoff und Kohlendioxid mit der Atemluft aus?',
  },
  {
    id: 'heart',
    name: 'Herz',
    emoji: '❤️',
    x: 45,
    y: 43,
    functionText: 'Dieser Muskel pumpt Blut durch den Körper und versorgt Gewebe mit Sauerstoff und Nährstoffen.',
    fact: 'Das Herz ist ein Muskel und ungefähr so groß wie die eigene Faust.',
    activity: 'Fühle deinen Puls am Handgelenk und beobachte, ob er nach Bewegung schneller wird.',
    quizQuestion: 'Welcher Muskel pumpt Blut durch den ganzen Körper?',
  },
  {
    id: 'liver',
    name: 'Leber',
    emoji: '🟤',
    x: 43,
    y: 54,
    functionText: 'Sie verarbeitet Nährstoffe, speichert Energie, bildet Galle und baut viele Stoffe im Körper um.',
    fact: 'Die Leber liegt überwiegend im rechten Oberbauch und ist das größte innere Organ.',
    activity: 'Zeige auf den rechten Oberbauch und überlege, welche Organe dort ungefähr liegen.',
    quizQuestion: 'Welches große Organ verarbeitet Nährstoffe und bildet unter anderem Galle?',
  },
  {
    id: 'stomach',
    name: 'Magen',
    emoji: '🥣',
    x: 56,
    y: 56,
    functionText: 'Er sammelt Nahrung, durchmischt sie und gibt sie portionsweise an den Dünndarm weiter.',
    fact: 'Der Magen ist ein dehnbarer Muskelsack im Oberbauch.',
    activity: 'Verfolge mit dem Finger den Weg von Mund über Speiseröhre bis zum Magen.',
    quizQuestion: 'Welches Organ sammelt und durchmischt Nahrung nach dem Schlucken?',
  },
  {
    id: 'intestines',
    name: 'Darm',
    emoji: '🌀',
    x: 50,
    y: 68,
    functionText: 'Im Dünndarm werden viele Nährstoffe aufgenommen; der Dickdarm entzieht dem Rest vor allem Wasser.',
    fact: 'Dünndarm und Dickdarm haben unterschiedliche Aufgaben bei der Verdauung.',
    activity: 'Zeichne mit dem Finger eine verschlungene Linie im Bauchbereich und nenne Dünn- und Dickdarm.',
    quizQuestion: 'Wo werden viele Nährstoffe und später auch Wasser aus dem Nahrungsbrei aufgenommen?',
  },
  {
    id: 'bones',
    name: 'Skelett',
    emoji: '🦴',
    x: 50,
    y: 86,
    functionText: 'Knochen stützen den Körper, schützen Organe und arbeiten mit Muskeln bei Bewegungen zusammen.',
    fact: 'Erwachsene haben meist 206 Knochen; bei Kindern sind einige Knochen noch nicht zusammengewachsen.',
    activity: 'Fühle vorsichtig Schlüsselbein oder Kniescheibe und überlege, welche Aufgabe der Knochen dort hat.',
    quizQuestion: 'Was stützt den Körper, schützt Organe und hilft zusammen mit Muskeln bei Bewegungen?',
  },
] as const;

export const DEFAULT_BODY_PARTS_WIDGET_SETTINGS: BodyPartsWidgetSettings = {
  mode: 'explore',
  showFacts: true,
  showActivities: true,
};

export function normalizeBodyPartsWidgetSettings(raw: unknown): BodyPartsWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    mode: value.mode === 'find' ? 'find' : 'explore',
    showFacts: typeof value.showFacts === 'boolean' ? value.showFacts : true,
    showActivities: typeof value.showActivities === 'boolean' ? value.showActivities : true,
  };
}

export function getNextBodyQuizOrgan(
  currentId: string | null,
  random: () => number = Math.random,
): BodyOrgan {
  const candidates = BODY_ORGANS.filter(organ => organ.id !== currentId);
  const pool = candidates.length > 0 ? candidates : [...BODY_ORGANS];
  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.max(0, Math.min(0.999999, random())) * pool.length),
  );
  return pool[index];
}

export function getBodyOrganById(id: string | null | undefined): BodyOrgan {
  return BODY_ORGANS.find(organ => organ.id === id) || BODY_ORGANS[0];
}
