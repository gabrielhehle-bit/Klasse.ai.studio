import React from 'react';
import type { AppState } from '../../types';
import { DEFAULT_CLASS_MASCOT, MASCOT_OPTIONS, mascotMessage, normalizeClassMascot, reactToMascotAction, selectClassMascot } from '../../lib/classMascot';
import type { ClassMascotKind, ClassMascotMood, ClassMascotState, ClassMascotAction } from '../../lib/classMascot';
import ClassMascotArtwork from './ClassMascotArtwork';

interface Props {
  app: AppState;
  setApp: React.Dispatch<React.SetStateAction<AppState>>;
}

const ACTIONS: ReadonlyArray<{ action: ClassMascotAction; label: string; icon: string }> = [
  { action: 'praise', label: 'Loben', icon: '⭐' },
  { action: 'calm', label: 'Zur Ruhe kommen', icon: '🌿' },
  { action: 'encourage', label: 'Mut machen', icon: '💛' },
];
const MOODS: ReadonlyArray<{ mood: ClassMascotMood; label: string }> = [
  { mood: 'happy', label: 'Fröhlich' },
  { mood: 'calm', label: 'Ruhig' },
  { mood: 'sleepy', label: 'Müde' },
  { mood: 'proud', label: 'Stolz' },
];

/** Self-contained cockpit widget; never floats, never reads individual pupil records. */
export default function ClassMascotWidget({ app, setApp }: Props) {
  const state = normalizeClassMascot(app.classMascot);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(state.name);
  React.useEffect(() => setNameDraft(state.name), [state.name, app.activeClassId]);

  const update = (fn: (current: ClassMascotState) => ClassMascotState) => {
    setApp(previous => ({ ...previous, classMascot: fn(normalizeClassMascot(previous.classMascot)) }));
  };
  const saveName = () => {
    const name = nameDraft.trim().slice(0, 24);
    if (!name) {
      setNameDraft(state.name);
      return;
    }
    if (name !== state.name) update(previous => ({ ...previous, name }));
  };

  return (
    <section aria-label="Klassenmaskottchen" className="class-mascot-v1 h-full min-h-0 w-full overflow-y-auto rounded-2xl bg-white p-3 text-slate-950 sm:p-4" style={{ colorScheme: 'light' }}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">Unser Klassenmaskottchen</div>
          <h3 className="break-words text-lg font-black text-slate-950">{state.name}</h3>
        </div>
        <button type="button" onClick={() => setSettingsOpen(open => !open)} aria-expanded={settingsOpen}
          aria-label={settingsOpen ? 'Maskottchen-Einstellungen schließen' : 'Maskottchen auswählen und Einstellungen öffnen'}
          className="min-h-10 shrink-0 rounded-xl border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-950 hover:bg-teal-100">
          {settingsOpen ? 'Fertig' : '⚙️ Ändern'}
        </button>
      </header>

      <div className="mt-2 grid min-w-0 grid-cols-[minmax(92px,1fr)_minmax(0,1.4fr)] items-center gap-2 rounded-2xl bg-gradient-to-br from-teal-50 via-white to-amber-50 p-2 sm:gap-3">
        <div className="min-w-0" style={{ maxHeight: 190 }}>
          <ClassMascotArtwork kind={state.kind} mood={state.mood} name={state.name} animationEnabled={state.animationEnabled} />
        </div>
        <div className="min-w-0 space-y-2">
          <p aria-live="polite" className="break-words text-sm font-semibold leading-relaxed text-slate-900">
            {mascotMessage(state)}
          </p>
          <span className="inline-flex rounded-full border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-teal-900">
            {MOODS.find(item => item.mood === state.mood)?.label}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ACTIONS.map(item => (
          <button key={item.action} type="button"
            onClick={() => update(previous => reactToMascotAction(previous, item.action))}
            className="min-h-11 rounded-xl border-2 border-teal-500 bg-teal-50 px-2 py-2 text-sm font-extrabold text-teal-950 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
            <span aria-hidden="true">{item.icon} </span>{item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-amber-950">Gemeinsam gesammelt</span>
          <span className="text-xs font-bold text-amber-900">{state.stars} / 5 Sterne</span>
        </div>
        <div className="mt-1 flex gap-1" role="img" aria-label={`${state.stars} von 5 Klassensternen gesammelt`}>
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={`text-lg ${index < state.stars ? 'text-amber-600' : 'text-slate-300'}`} aria-hidden="true">★</span>
          ))}
        </div>
        {state.stars === 5 && (
          <button type="button" onClick={() => update(previous => ({ ...previous, stars: 0 }))}
            className="mt-1 min-h-9 rounded-lg bg-white px-3 text-xs font-extrabold text-amber-950 underline underline-offset-2 hover:bg-amber-100">
            Gemeinsames Ziel gefeiert · Sterne neu starten
          </button>
        )}
      </div>

      {settingsOpen && (
        <div className="mt-3 space-y-3 rounded-2xl border-2 border-teal-200 bg-slate-50 p-3">
          <fieldset>
            <legend className="text-xs font-black text-slate-900">Figur auswählen</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MASCOT_OPTIONS.map(option => (
                <button key={option.kind} type="button" aria-pressed={state.kind === option.kind}
                  onClick={() => { update(previous => selectClassMascot(previous, option.kind)); setNameDraft(option.name); }}
                  className={`flex min-h-12 flex-col items-start rounded-xl border-2 px-2 py-2 text-left text-xs font-black text-slate-950 ${state.kind === option.kind ? 'border-teal-700 bg-teal-100' : 'border-slate-200 bg-white hover:border-teal-400'}`}>
                  <span>{option.label}</span>
                  <span className="mt-0.5 text-[10px] font-medium text-slate-700">{option.character}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-black text-slate-900">Name des Maskottchens
            <input type="text" maxLength={24} value={nameDraft}
              onChange={event => setNameDraft(event.target.value)}
              onBlur={saveName}
              onKeyDown={event => { if (event.key === 'Enter') { event.currentTarget.blur(); } }}
              className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"
              placeholder="Name eingeben" />
          </label>
          <label className="block text-xs font-black text-slate-900">Stimmung
            <select value={state.mood}
              onChange={event => update(previous => ({ ...previous, mood: event.target.value as ClassMascotMood }))}
              className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950">
              {MOODS.map(item => <option key={item.mood} value={item.mood}>{item.label}</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-slate-900">
            <input type="checkbox" checked={state.animationEnabled}
              onChange={event => update(previous => ({ ...previous, animationEnabled: event.target.checked }))}
              className="h-4 w-4 accent-teal-700" />
            Sanfte Animation aktivieren
          </label>
          <p className="text-[11px] leading-relaxed text-slate-700">
            Dieses Maskottchen gehört nur zu dieser Klasse. Die Stimmung wird bewusst von der Lehrkraft gewählt,
            nicht aus persönlichen Daten, Verhalten oder dem Befinden einzelner Kinder errechnet.
          </p>
          {state.kind === 'elf' && <p className="text-[11px] leading-relaxed text-slate-700">Elio ist ein eigenständig gestalteter kleiner Wald- und Schulhauself.</p>}
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-100"
            onClick={() => update(() => ({ ...DEFAULT_CLASS_MASCOT }))}>
            Maskottchen auf Olivia zurücksetzen
          </button>
        </div>
      )}
    </section>
  );
}
