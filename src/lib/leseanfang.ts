import { checkSentenceTask, shuffleArray } from './wortSatzWerkstattAlgorithm';

export const READING_MODES = {
  syllables: { label: 'Silben legen', instruction: 'Lege die Silben der Reihe nach.', tasks: [
    { cards: ['La', 'ma'], picture: '🦙' },
    { cards: ['Na', 'se'], picture: '👃' },
    { cards: ['Ro', 'se'], picture: '🌹' },
    { cards: ['Do', 'se'], picture: '🥫' },
    { cards: ['Lu', 'pe'], picture: '🔍' },
    { cards: ['Ho', 'se'], picture: '👖' },
  ] },
  letters: { label: 'Wörter bauen', instruction: 'Lege die Buchstaben der Reihe nach.', tasks: [
    { cards: ['O', 'm', 'a'], picture: '👵' },
    { cards: ['O', 'p', 'a'], picture: '👴' },
    { cards: ['B', 'u', 's'], picture: '🚌' },
    { cards: ['L', 'a', 'm', 'a'], picture: '🦙' },
    { cards: ['H', 'u', 't'], picture: '🎩' },
    { cards: ['M', 'o', 'n', 'd'], picture: '🌙' },
  ] },
  sentences: { label: 'Sätze bauen', instruction: 'Lege die Wörter in die richtige Reihenfolge.', tasks: [
    { cards: ['Mia', 'malt', 'gern.'], picture: '🎨', hint: 'Farbpalette' },
    { cards: ['Oma', 'liest', 'vor.'], picture: '📖', hint: 'Offenes Buch' },
    { cards: ['Der', 'Bus', 'kommt.'], picture: '🚌', hint: 'Bus' },
    { cards: ['Das', 'Lama', 'frisst.'], picture: '🦙', hint: 'Lama' },
    { cards: ['Wir', 'singen', 'ein', 'Lied.'], picture: '🎵', hint: 'Musiknote' },
    { cards: ['Der', 'Mond', 'ist', 'rund.'], picture: '🌕', hint: 'Vollmond' },
  ] },
};

export type ReadingMode = keyof typeof READING_MODES;

export interface ReadingExercise {
  mode: ReadingMode;
  taskIndex: number;
  order: number[];
  placed: number[];
  checked: boolean;
}

export function startReadingExercise(mode: ReadingMode = 'syllables', taskIndex = 0): ReadingExercise {
  const tasks = READING_MODES[mode].tasks;
  const index = (taskIndex + tasks.length) % tasks.length;
  return { mode, taskIndex: index, order: shuffleArray(tasks[index].cards.map((_, index) => index)), placed: [], checked: false };
}

export function restoreReadingExercise(saved: unknown): ReadingExercise {
  const state = saved as Partial<ReadingExercise> | null | undefined;
  const mode = state?.mode === 'letters' || state?.mode === 'sentences' ? state.mode : 'syllables';
  const taskIndex = state?.taskIndex ?? 0;
  const task = READING_MODES[mode].tasks[taskIndex];
  if (!Number.isInteger(taskIndex) || !task) return startReadingExercise(mode);

  const validIndices = (value: unknown): value is number[] => Array.isArray(value) &&
    new Set(value).size === value.length && value.every(index => Number.isInteger(index) && index >= 0 && index < task.cards.length);
  if (!validIndices(state?.order) || state.order.length !== task.cards.length) return startReadingExercise(mode, taskIndex);

  const placed = validIndices(state.placed) ? state.placed : [];
  return { mode, taskIndex, order: state.order, placed, checked: state.checked === true && placed.length === task.cards.length };
}

export function isReadingExerciseSolved(exercise: ReadingExercise): boolean {
  const task = READING_MODES[exercise.mode].tasks[exercise.taskIndex];
  return checkSentenceTask(exercise.placed.map(index => task.cards[index]), task.cards);
}
