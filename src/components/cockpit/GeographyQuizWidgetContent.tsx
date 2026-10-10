import React, { useState } from 'react';
import { AUSTRIAN_STATES, matchesAustrianCapital } from '../../lib/austrianStates';
import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';

export const GeographyquizWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: any) => void;
}> = ({ widget, currentIsLight, onUpdate }) => {
  const saved = readWidgetLifecycleState(widget, 'geographyquiz', {
    mode: 'discover' as 'discover' | 'practice', index: 0, guess: '',
    feedback: 'Errate die Landeshauptstadt.', solved: false,
  });
  const [mode, setMode] = useState(saved.mode);
  const [index, setIndex] = useState(saved.index);
  const [guess, setGuess] = useState(saved.guess);
  const [feedback, setFeedback] = useState(saved.feedback);
  const [solved, setSolved] = useState(saved.solved);
  usePersistedWidgetLifecycleState(widget, onUpdate, 'geographyquiz', { mode, index, guess, feedback, solved });
  const state = AUSTRIAN_STATES[index] ?? AUSTRIAN_STATES[0];
  const surface = currentIsLight ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-zinc-900 text-slate-100';
  const selectState = (next: number) => {
    if (next === index) return;
    setIndex(next); setGuess(''); setSolved(false); setFeedback('Errate die Landeshauptstadt.');
  };
  const check = () => {
    if (solved) return;
    if (!guess.trim()) { setFeedback('Gib zuerst eine Landeshauptstadt ein.'); return; }
    const correct = matchesAustrianCapital(guess, state.capital);
    setSolved(correct);
    setFeedback(correct ? 'Richtig! ' + state.capital + ' ist die Landeshauptstadt.' : 'Noch nicht. Versuche es erneut oder zeige die Lösung.');
  };
  return (
    <div role="region" aria-label="Bundesländer-Forscher" className={'flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 ' + surface}>
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {(['discover', 'practice'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={'min-h-11 rounded-xl border px-3 text-sm font-black ' + (mode === value ? 'bg-accent text-accent-text' : surface)}>{value === 'discover' ? 'Entdecken' : 'Üben'}</button>)}
      </div>
      <div role="group" aria-label="Alle neun Bundesländer" className="grid shrink-0 grid-cols-3 gap-2">
        {AUSTRIAN_STATES.map((entry, i) => <button key={entry.name} type="button" aria-pressed={index === i} onClick={() => selectState(i)} className={'min-h-11 rounded-xl border px-2 text-sm font-bold ' + (index === i ? 'bg-accent-soft text-accent border-accent' : surface)}>{entry.name}</button>)}
      </div>
      <div className={'flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border p-3 text-center ' + surface}>
        <p className="text-xs font-bold opacity-60">Bundesland {index + 1} von 9</p>
        <h3 className="text-xl font-black">{state.name}</h3>
        {mode === 'discover' ? <><p className="text-sm font-bold">Landeshauptstadt</p><p className="text-2xl font-black text-accent">{state.capital}</p></> : <>
          <label htmlFor={'capital-' + widget.id} className="text-sm font-bold">Wie heißt die Landeshauptstadt?</label>
          <form onSubmit={event => { event.preventDefault(); check(); }} className="flex w-full max-w-lg gap-2">
            <input id={'capital-' + widget.id} aria-label="Landeshauptstadt" value={guess} onChange={event => { setGuess(event.target.value); if (!solved) setFeedback('Errate die Landeshauptstadt.'); }} readOnly={solved} className={'min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-base ' + surface} autoComplete="off" />
            <button type="submit" disabled={solved} className="min-h-11 rounded-xl bg-accent px-3 text-sm font-black text-accent-text disabled:opacity-50">Prüfen</button>
          </form>
          <p role="status" aria-live="polite" className="text-sm font-bold">{feedback}</p>
          <button type="button" onClick={() => setFeedback('Lösung: ' + state.capital)} className={'min-h-11 rounded-xl border px-3 text-sm font-bold ' + surface}>Lösung zeigen</button>
        </>}
      </div>
      <button type="button" onClick={() => selectState((index + 1) % AUSTRIAN_STATES.length)} className="min-h-11 shrink-0 rounded-xl bg-accent px-3 text-sm font-black text-accent-text">Nächstes Bundesland</button>
    </div>
  );
};
