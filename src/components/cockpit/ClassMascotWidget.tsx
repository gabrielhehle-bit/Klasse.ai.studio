import React from 'react';
import type { AppState } from '../../types';
import { DEFAULT_CLASS_MASCOT, MASCOT_OPTIONS, mascotMessage, normalizeClassMascot, reactToMascotAction, selectClassMascot } from '../../lib/classMascot';
import type { ClassMascotKind, ClassMascotMood, ClassMascotState, ClassMascotAction } from '../../lib/classMascot';
import ClassMascotArtwork from './ClassMascotArtwork';

interface Props {
  app: AppState;
  setApp: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight?: boolean;
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
export default function ClassMascotWidget({ app, setApp, currentIsLight = true }: Props) {
  const state = normalizeClassMascot(app.classMascot);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
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
    <section aria-label="Klassenmaskottchen" className={`class-mascot-v1 class-mascot-freestanding flex h-full min-h-0 w-full flex-col items-center overflow-y-auto overflow-x-hidden p-1 sm:p-2 ${detailsOpen || settingsOpen ? "pointer-events-auto justify-start pt-11" : "pointer-events-none justify-end"}`}> 
      {/* The illustration is the resting UI: no widget card, backdrop, border, or global floating layer. */}
      <button type="button" aria-expanded={detailsOpen || settingsOpen}
        aria-label={detailsOpen || settingsOpen ? 'Maskottchen-Interaktionen schließen' : state.name + ' begrüßen und Interaktionen öffnen'}
        title={state.name + ' · antippen für Aktionen'}
        onClick={() => {
          setDetailsOpen(value => !value);
          if (detailsOpen) setSettingsOpen(false);
        }}
        className="class-mascot-character pointer-events-auto inline-flex min-h-0 max-w-full shrink-0 self-center items-end justify-center bg-transparent p-0 focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        style={{ width: detailsOpen || settingsOpen ? 128 : 'min(280px, 100%)', maxHeight: detailsOpen || settingsOpen ? 128 : 'calc(100% - 34px)', aspectRatio: '180 / 182' }}>
        <div className="pointer-events-none h-full w-full">
          <ClassMascotArtwork kind={state.kind} mood={state.mood} name={state.name} animationEnabled={state.animationEnabled} />
        </div>
      </button>
      <p className={'class-mascot-name mt-0.5 text-center text-base font-black tracking-tight ' + (currentIsLight ? 'text-slate-950' : 'text-white')}
        style={{ color: currentIsLight ? '#0f172a' : '#ffffff', textShadow: currentIsLight ? '0 1px 2px rgba(255,255,255,.85)' : '0 1px 3px rgba(0,0,0,.9)' }}>
        {state.name}
      </p>

      {(detailsOpen || settingsOpen) && (
        <div className="class-mascot-details pointer-events-auto mt-2 w-full max-w-md space-y-2 rounded-2xl border border-teal-200 bg-white/95 p-3 text-slate-950 shadow-lg backdrop-blur-sm"
          aria-label="Klassenmaskottchen-Interaktionen">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950">Unser Klassenmaskottchen</h3>
              <p aria-live="polite" className="text-xs font-semibold leading-relaxed text-slate-800">{mascotMessage(state)}</p>
            </div>
            <button type="button" onClick={() => setSettingsOpen(open => !open)} aria-expanded={settingsOpen}
              aria-label={settingsOpen ? 'Maskottchen-Einstellungen schließen' : 'Maskottchen auswählen und Einstellungen öffnen'}
              className="min-h-11 shrink-0 rounded-xl border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-950 hover:bg-teal-100">
              {settingsOpen ? 'Fertig' : '⚙️ Ändern'}
            </button>
          </div>
          <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-extrabold text-teal-950">
            {MOODS.find(item => item.mood === state.mood)?.label}
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ACTIONS.map(item => (
              <button key={item.action} type="button"
                onClick={() => update(previous => reactToMascotAction(previous, item.action))}
                className="min-h-11 rounded-xl border-2 border-teal-500 bg-teal-50 px-2 py-2 text-xs font-extrabold text-teal-950 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
                <span aria-hidden="true">{item.icon} </span>{item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-amber-950">
            <span>Gemeinsam gesammelt:</span>
            <span role="img" aria-label={state.stars + ' von 5 Klassensternen gesammelt'}>
              {Array.from({ length: 5 }, (_, index) => <span key={index} aria-hidden="true" className={index < state.stars ? 'text-amber-600' : 'text-slate-300'}>★</span>)}
            </span>
            {state.stars === 5 && (
              <button type="button" onClick={() => update(previous => ({ ...previous, stars: 0 }))}
                className="min-h-9 rounded-lg border border-amber-300 bg-amber-50 px-2 text-xs font-extrabold text-amber-950">
                Gemeinsames Ziel gefeiert · Sterne neu starten
              </button>
            )}
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="class-mascot-settings pointer-events-auto mt-3 w-full max-w-md space-y-3 rounded-2xl border-2 border-teal-200 bg-slate-50 p-3">
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
