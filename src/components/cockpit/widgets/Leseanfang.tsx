import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Eye, RotateCcw } from 'lucide-react';
import { isReadingExerciseSolved, READING_MODES, restoreReadingExercise, startReadingExercise, type ReadingExercise, type ReadingMode } from '../../../lib/leseanfang';

const readingModes = Object.keys(READING_MODES) as ReadingMode[];

export function Leseanfang({ saved, onChange, onShowAll, light }: {
  saved: unknown;
  onChange: (exercise: ReadingExercise) => void;
  onShowAll: () => void;
  light: boolean;
}) {
  const [exercise, setExercise] = useState(() => restoreReadingExercise(saved));
  const savedRef = useRef(saved);
  const cardsRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (savedRef.current === saved) return;
    savedRef.current = saved;
    setExercise(restoreReadingExercise(saved));
  }, [saved]);

  const { mode, taskIndex, order, placed, checked } = exercise;
  const { instruction, tasks } = READING_MODES[mode];
  const task = tasks[taskIndex];
  const solved = checked && isReadingExerciseSolved(exercise);
  const cardStyle = `inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border px-3 py-1 text-xl font-bold sm:min-h-14 sm:px-4 sm:text-2xl ${light ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-600 bg-neutral-800 text-white'}`;
  const controlStyle = `inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-2 text-sm font-semibold disabled:opacity-40 ${light ? 'border-slate-200 bg-white hover:bg-slate-100' : 'border-neutral-700 bg-neutral-900 hover:bg-neutral-800'}`;
  const update = (next: ReadingExercise) => {
    setExercise(next);
    onChange(next);
  };

  return (
    <div data-reading-mode={mode} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 pb-12" aria-label="Leseanfang">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Übung wählen" className={`flex flex-wrap items-center gap-1 rounded-xl p-1 ${light ? 'bg-slate-200/70' : 'bg-neutral-800'}`}>
          {readingModes.map(key => (
            <button key={key} type="button" aria-pressed={mode === key}
              onClick={() => { if (key !== mode) update(startReadingExercise(key)); }}
              className={`min-h-11 rounded-lg px-2.5 text-sm font-bold ${key === mode ? 'bg-accent text-accent-text' : 'hover:bg-accent-soft hover:text-accent'}`}>
              {READING_MODES[key].label}
            </button>
          ))}
        </div>
        <button type="button" className={controlStyle} onClick={onShowAll}>Alle Übungen <ArrowRight size={16} aria-hidden="true" /></button>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto overscroll-contain rounded-2xl border px-2 py-2 text-center sm:gap-3 ${light ? 'border-slate-200 bg-white/85' : 'border-neutral-700 bg-neutral-950/35'}`}>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="text-3xl leading-none sm:text-4xl" role="img" aria-label={mode === 'sentences' ? READING_MODES.sentences.tasks[taskIndex].hint : task.cards.join('')}>{task.picture}</span>
          <h3 className="text-base font-extrabold sm:text-xl">{instruction}</h3>
        </div>
        <div aria-label="Gelegte Karten" className="flex flex-wrap justify-center gap-2">
          {task.cards.map((_, position) => {
            const index = placed[position];
            return index === undefined ? (
              <span key={position} aria-hidden="true" className={`${cardStyle} border-dashed! bg-transparent!`} />
            ) : (
              <button key={position} type="button" className={`${cardStyle} ${solved ? 'border-emerald-500!' : ''}`}
                aria-label={`${task.cards[index]} zurücklegen`}
                onClick={event => {
                  update({ ...exercise, placed: placed.filter((_, slot) => slot !== position), checked: false });
                  if (event.detail === 0) requestAnimationFrame(() => cardsRef.current?.querySelector<HTMLButtonElement>(`[data-reading-card="${index}"]`)?.focus());
                }}>{task.cards[index]}</button>
            );
          })}
        </div>
        <div ref={cardsRef} aria-label="Karten zum Antippen" className="flex flex-wrap justify-center gap-2">
          {order.map(index => (
            <button key={index} type="button" data-reading-card={index} aria-label={`${task.cards[index]} legen`}
              className={`${cardStyle} border-accent/50 bg-accent-soft text-accent disabled:invisible`}
              disabled={placed.includes(index)} onClick={event => {
                update({ ...exercise, placed: [...placed, index], checked: false });
                if (event.detail === 0) requestAnimationFrame(() => (cardsRef.current?.querySelector<HTMLButtonElement>('button:enabled') ?? checkRef.current)?.focus());
              }}>
              {task.cards[index]}
            </button>
          ))}
        </div>
        <div role="status" className={`min-h-6 text-sm font-bold ${checked ? (solved ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300') : ''}`}>
          {checked && (solved ? 'Das passt.' : 'Schau dir die Reihenfolge noch einmal an.')}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1" aria-label="Aufgaben wechseln">
          <button type="button" className={controlStyle} aria-label="Vorherige Aufgabe" onClick={() => update(startReadingExercise(mode, taskIndex - 1))}><ChevronLeft size={19} aria-hidden="true" /></button>
          <span className="min-w-12 text-center text-sm font-semibold tabular-nums">{taskIndex + 1} / {tasks.length}</span>
          <button type="button" className={controlStyle} aria-label="Nächste Aufgabe" onClick={() => update(startReadingExercise(mode, taskIndex + 1))}><ChevronRight size={19} aria-hidden="true" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={controlStyle} disabled={!placed.length} onClick={() => update({ ...exercise, placed: [], checked: false })}><RotateCcw size={16} aria-hidden="true" /> Neu legen</button>
          <button type="button" className={controlStyle} onClick={() => update({ ...exercise, placed: task.cards.map((_, index) => index), checked: true })}><Eye size={16} aria-hidden="true" /> Lösung</button>
          <button ref={checkRef} type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-bold text-accent-text disabled:opacity-50"
            disabled={placed.length !== task.cards.length} onClick={() => update({ ...exercise, checked: true })}><Check size={18} aria-hidden="true" /> Prüfen</button>
        </div>
      </div>
    </div>
  );
}
