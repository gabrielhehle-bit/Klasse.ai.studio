import { trails } from './lesespur';
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
  stories: {label:'Bilderfolge', instruction:'Lege die Bilder der Reihe nach.', tasks:[
    {cards:['🥚','🐣','🐔'],picture:'📖',labels:['Ei','Küken schlüpft','Huhn'],voice:'des Kükens'},
    {cards:['🌻','🌻✂️','💐'],picture:'📖',labels:['Sonnenblume','Blume abschneiden','Blumenstrauß'],voice:'der Sonnenblume'},
    {cards:['❄️','⛄','☀️💧'],picture:'📖',labels:['Schnee fällt','Schneemann','Schnee schmilzt'],voice:'des Schneemanns'},
  ]},
  trail: {label:'Lesespur', instruction:'Lies und finde die passende Antwort.', tasks:trails[0].map(t=>({cards:t.choices,picture:''}))},
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

const harder = {
  syllables: [
    ['Ba-na-ne 🍌','To-ma-te 🍅','Ra-ke-te 🚀'],
    ['Re-gen-bo-gen 🌈','Was-ser-far-be 🎨','Hub-schrau-ber 🚁'],
    ['Son-nen-blu-men-kern 🌻','Fahr-rad-ket-te 🚲','Ge-burts-tags-ku-chen 🎂'],
  ],
  letters: [
    ['Blume 🌷','Wolke ☁️','Apfel 🍎'], ['Schnecke 🐌','Schlüssel 🔑','Spiegel 🪞'], ['Briefkasten 📮','Taschenlampe 🔦','Schneeflocke ❄️'],
  ],
  sentences: [
    ['Ein kleiner Igel schläft. 🦔','Ein roter Apfel fällt. 🍎','Die gelbe Ente schwimmt. 🦆'],
    ['Mia lacht, weil der Frosch hüpft. 🐸','Das Eis schmilzt, weil die Sonne scheint. ☀️','Der Hund bellt, als es klingelt. 🐕'],
    ['Obwohl es regnet, blüht die Rose. 🌹','Bevor der Zug abfährt, pfeift jemand. 🚂','Nachdem das Eis geschmolzen ist, tropft es. 💧'],
  ],
};
export function readingTasks(mode: ReadingMode, level: number): {cards:string[];picture:string;hint?:string}[] {
  if (mode === 'trail') return trails[level-1].map(t => ({cards:t.choices,picture:''}));
  if (level === 1 || mode === 'stories') return READING_MODES[mode].tasks;
  return harder[mode][level-2].map(line => {
    const words = line.split(' ');
    const picture = words.pop()!;
    const cards = mode==='sentences' ? words : words[0].split(mode==='letters' ? '' : '-');
    return {picture,cards};
  });
}
export interface ReadingExercise {
  level: number;
  evidence?: number[];
  mode: ReadingMode;
  taskIndex: number;
  order: number[];
  placed: number[];
  checked: boolean;
}

export function startReadingExercise(mode: ReadingMode = 'syllables', taskIndex = 0, level = 1): ReadingExercise {
  const tasks = readingTasks(mode,level);
  const index = (taskIndex + tasks.length) % tasks.length;
  return { level, mode, taskIndex: index, order: shuffleArray(tasks[index].cards.map((_, index) => index)), placed: [], checked: false };
}

export function restoreReadingExercise(saved: unknown, classGrade = 1): ReadingExercise {
  const state = saved as Partial<ReadingExercise> | null | undefined;
  const candidate = state ? state.level : classGrade;
  const level = candidate === 2 || candidate === 3 || candidate === 4 ? candidate : 1;
  const mode = state?.mode === 'stories' || state?.mode === 'trail' || state?.mode === 'letters' || state?.mode === 'sentences' ? state.mode : 'syllables';
  const taskIndex = state?.taskIndex ?? 0;
  const task = readingTasks(mode,level)[taskIndex];
  if (!Number.isInteger(taskIndex) || !task) return startReadingExercise(mode,0,level);

  const validIndices = (value: unknown): value is number[] => Array.isArray(value) &&
    new Set(value).size === value.length && value.every(index => Number.isInteger(index) && index >= 0 && index < task.cards.length);
  if (!validIndices(state?.order) || state.order.length !== task.cards.length) return startReadingExercise(mode,taskIndex,level);

  const placed = validIndices(state.placed) ? state.placed : [];
  if(mode==='trail') {
    const sentences = trails[level-1][taskIndex].sentences ?? [];
    const evidence = Array.isArray(state.evidence) ? [...new Set(state.evidence.filter(i=>Number.isInteger(i) && i>=0 && i<sentences.length))] : [];
    return {level, mode, taskIndex, order:state.order, placed:placed.slice(0,1), checked:state.checked===true && placed.length===1, evidence};
  }
  return { level, mode, taskIndex, order: state.order, placed, checked: state.checked === true && placed.length === task.cards.length };
}

export function isReadingExerciseSolved(exercise: ReadingExercise): boolean {
  if(exercise.mode==='trail') {
    const task = trails[exercise.level-1][exercise.taskIndex];
    const evidence = exercise.evidence ?? [];
    return exercise.placed[0]===task.answer && (!task.clues || (evidence.length===task.clues.length && task.clues.every(i=>evidence.includes(i))));
  }
  const task = readingTasks(exercise.mode,exercise.level)[exercise.taskIndex];
  return checkSentenceTask(exercise.placed.map(index => task.cards[index]), task.cards);
}
