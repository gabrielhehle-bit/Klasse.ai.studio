import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWidgetSize } from '../widgetLayout';
import { useApp } from '../../../context/AppContext';
import type { CockpitWidgetConfig } from '../../../types';
import {
  aggregateStarsReview, DEFAULT_STARS_REVIEW_SETTINGS,
  starsIsoLocalDate, starsReviewRange, starsReviewSubjects,
  type StarsReviewSettings, type StarsPeriod, type StarsLimit,
} from '../../../lib/starsReview';

interface Props {
  widget: CockpitWidgetConfig;
  currentIsLight: boolean;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}
function safeSettings(value: unknown): StarsReviewSettings {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const period: StarsPeriod = data.period === 'month' || data.period === 'custom' ? data.period : 'week';
  const limit: StarsLimit = data.limit === 10 || data.limit === 'all' ? data.limit : 3;
  return {
    period,
    referenceDate: typeof data.referenceDate === 'string' ? data.referenceDate : '',
    startDate: typeof data.startDate === 'string' ? data.startDate : '',
    endDate: typeof data.endDate === 'string' ? data.endDate : '',
    limit,
    subjects: Array.isArray(data.subjects) ? data.subjects.filter((subject): subject is string => typeof subject === 'string' && !!subject.trim()) : [],
  };
}
function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return day + '.' + month + '.' + year;
}

/** Public presentation is opt-in each time the widget opens: no pupil rankings on the board by default. */
export default function StarsReviewWidget({
  widget,
  onUpdate,
  currentIsLight,
  showSettings: externalShowSettings,
  onCloseSettings,
}: Props) {
  const { app } = useApp();
  const containerRef = useRef<HTMLElement>(null);
  const size = useWidgetSize(containerRef);
  const compact = size.width < 620 || size.height < 420;
  const tiny = size.width < 420 || size.height < 300;
  const roomy = size.width >= 900 && size.height >= 520;
  const [today, setToday] = useState(() => new Date());
  const [localShowSettings, setLocalShowSettings] = useState(false);
  const hasExternalSettingsControl = typeof externalShowSettings === 'boolean';
  const showSettings = externalShowSettings === true || localShowSettings;
  const closeSettings = () => {
    setLocalShowSettings(false);
    if (externalShowSettings) onCloseSettings?.();
  };
  const [presenting, setPresenting] = useState(false);
  useEffect(() => {
    const tick = () => setToday(new Date());
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    setPresenting(false);
    setLocalShowSettings(false);
  }, [app.activeClassId, widget.id]);
  const settings = useMemo(() => safeSettings(widget.settings?.starsReview), [widget.settings?.starsReview]);
  const children = app.schueler || [];
  const logs = app.mitarbeitLogs || [];
  const availableSubjects = useMemo(
    () => starsReviewSubjects(logs, children, app.faecher || []),
    [logs, children, app.faecher],
  );
  const range = useMemo(() => starsReviewRange(settings, today), [settings, today]);
  const ranked = useMemo(() => aggregateStarsReview(children, logs, settings, today), [children, logs, settings, today]);
  const duplicateFirstNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const child of children) {
      const key = (child.vorname || '').toLocaleLowerCase('de-AT');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [children]);
  const update = (patch: Partial<StarsReviewSettings>) => {
    setPresenting(false);
    onUpdate({ settings: {
      ...(widget.settings || {}),
      starsReview: { ...settings, ...patch },
    } });
  };
  const toggleSubject = (subject: string) => {
    const next = settings.subjects.includes(subject)
      ? settings.subjects.filter(item => item !== subject)
      : [...settings.subjects, subject];
    // Selecting a single subject from "all" starts a new, explicit subset.
    update({ subjects: settings.subjects.length === 0 ? [subject] : next });
  };
  const surface = currentIsLight ? 'text-slate-900' : 'text-white';
  const button = compact
    ? 'min-h-11 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 hover:bg-accent-soft hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-white/15 dark:bg-zinc-800 dark:text-slate-100'
    : 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-accent-soft hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-white/15 dark:bg-zinc-800 dark:text-slate-100';
  return <section ref={containerRef} aria-label="Sterne der Klasse im gewählten Zeitraum" className={`flex h-full min-h-0 flex-col overflow-hidden ${surface}`}>
    <header className={`flex min-h-11 shrink-0 flex-wrap items-center justify-between border-b border-slate-200 dark:border-white/10 ${compact ? "gap-1 px-2 py-1" : "gap-2 px-3 py-2"}`}>
      <p className={`${tiny ? 'text-[10px]' : 'text-xs'} min-w-0 truncate font-semibold text-slate-500 dark:text-slate-400`}>
        {range ? `${formatDate(range.start)} – ${formatDate(range.end)}` : 'Ungültiger Zeitraum'}
        {' · '}{settings.subjects.length ? settings.subjects.join(', ') : 'Alle Fächer'}
      </p>
      <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-2"}`}>
        {!hasExternalSettingsControl && (
          <button
            type="button"
            className={button}
            aria-expanded={showSettings}
            onClick={() => {
              setLocalShowSettings(value => !value);
              setPresenting(false);
            }}
          >
            ⚙️ Einstellen
          </button>
        )}
        {presenting && (
          <button type="button" className={button} onClick={() => setPresenting(false)}>
            🔒 Verbergen
          </button>
        )}
      </div>
    </header>
    {showSettings ? <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-3" aria-label="Sterne-Auswertung konfigurieren">
      <div className="flex min-h-11 items-center justify-between rounded-xl border border-accent bg-accent-soft px-2.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-accent">Sterne-Auswertung einstellen</span>
        <button type="button" onClick={closeSettings} className="min-h-11 rounded-xl px-3 text-xs font-bold text-accent hover:bg-white/60 dark:hover:bg-white/10">Fertig</button>
      </div>
      <fieldset className="flex flex-wrap gap-2"><legend className="mb-2 text-sm font-black">Zeitraum</legend>
        {([['week', 'Woche'], ['month', 'Monat'], ['custom', 'Eigene Daten']] as const).map(([period, label]) =>
          <button type="button" key={period} aria-pressed={settings.period === period} className={`${button} ${settings.period === period ? 'ring-2 ring-accent' : ''}`} onClick={() => update({ period })}>{label}</button>)}
      </fieldset>
      {settings.period === 'custom' ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-sm font-bold">Von <input type="date" aria-label="Sterne von" value={settings.startDate} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white focus:border-accent px-2 text-slate-900" onChange={e => update({ startDate: e.target.value })} /></label>
        <label className="text-sm font-bold">Bis <input type="date" aria-label="Sterne bis" value={settings.endDate} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white focus:border-accent px-2 text-slate-900" onChange={e => update({ endDate: e.target.value })} /></label>
      </div> : <label className="block text-sm font-bold">Woche / Monat mit diesem Datum
        <input type="date" aria-label="Referenzdatum für Stern-Auswertung" value={settings.referenceDate || starsIsoLocalDate(today)}
          onChange={e => update({ referenceDate: e.target.value })}
          className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white focus:border-accent px-2 text-slate-900" />
        <button type="button" className={`${button} mt-2`} onClick={() => update({ referenceDate: '' })}>Aktuelle {settings.period === 'week' ? 'Woche' : 'Monat'}</button>
      </label>}
      {!range && <p role="alert" className="rounded-lg bg-rose-100 p-2 text-sm font-bold text-rose-900">Bitte gültige Anfangs- und Enddaten in der richtigen Reihenfolge eingeben.</p>}
      <fieldset className="flex flex-wrap gap-2"><legend className="mb-2 text-sm font-black">Wie viele Kinder zeigen?</legend>
        {([ [3, 'Top 3'], [10, 'Top 10'], ['all', 'Alle Kinder'] ] as const).map(([limit, label]) =>
          <button type="button" key={limit} aria-pressed={settings.limit === limit} className={`${button} ${settings.limit === limit ? 'ring-2 ring-accent' : ''}`} onClick={() => update({ limit })}>{label}</button>)}
      </fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-black">Fächer auswählen</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={settings.subjects.length === 0} onChange={() => update({ subjects: [] })} /> Alle Fächer (auch Einträge ohne Fach)</label>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {availableSubjects.map(subject => <label key={subject} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-2 text-sm font-semibold">
            <input type="checkbox" checked={settings.subjects.includes(subject)} onChange={() => toggleSubject(subject)} />{subject}
          </label>)}
        </div>
        <p className="text-xs opacity-75">Einträge ohne Fach zählen nur bei „Alle Fächer“.</p>
      </fieldset>
      <button type="button" className={`${button} w-full border-accent bg-accent text-accent-text hover:bg-accent-hover`} onClick={closeSettings}>Einstellungen übernehmen</button>
    </div> : !presenting ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <span className={roomy ? 'text-8xl' : 'text-5xl'} aria-hidden="true">🌟</span>
      <p className={`${roomy ? 'max-w-xl text-xl' : 'max-w-md text-base'} font-semibold`}>Die Sterneauswertung ist vorbereitet. Die Namen und Punktzahlen sind erst nach deiner Freigabe auf der Tafel sichtbar.</p>
      <button type="button" disabled={!range || !children.length} className={`${button} border-accent bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40`} onClick={() => setPresenting(true)}>⭐ Ergebnisse jetzt zeigen</button>
      {!children.length && <p className="text-sm font-semibold">In dieser Klasse sind noch keine Kinder eingetragen.</p>}
    </div> : <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compact ? "p-1.5" : "p-3"}`} aria-live="polite">
      <p className="mb-3 text-xs font-semibold opacity-80">{settings.limit === 'all' ? 'Alle Kinder' : `Top ${settings.limit}`} · {ranked.length} {ranked.length === 1 ? 'Kind' : 'Kinder'} · dokumentierte Sterne im gewählten Zeitraum</p>
      <ol className={roomy ? "space-y-3" : "space-y-2"}>{ranked.map(row => {
        const child = children.find(item => item.id === row.studentId);
        const duplicate = (duplicateFirstNames.get(row.firstName.toLocaleLowerCase('de-AT')) || 0) > 1;
        const label = duplicate && child?.nachname ? `${row.firstName} ${child.nachname.slice(0, 1)}.` : row.firstName;
        return <li key={row.studentId} className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-zinc-900 dark:text-slate-100 ${compact ? "min-h-10 gap-1 px-2 py-1.5" : roomy ? "min-h-16 gap-4 px-5 py-3" : "min-h-12 gap-3 px-3 py-2"}`}>
          <span className={`min-w-0 break-words [overflow-wrap:anywhere] font-extrabold leading-snug ${compact ? "text-sm" : roomy ? "text-xl" : "text-base"}`}><span className="mr-2 text-amber-700">{row.rank}.</span>{label}</span>
          <span className={`${roomy ? 'text-2xl' : 'text-base'} shrink-0 font-black text-amber-800`} aria-label={`${row.stars} Sterne`}>⭐ {row.stars}</span>
        </li>;
      })}</ol>
    </div>}
  </section>;
}
