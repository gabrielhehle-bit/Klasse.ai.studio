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
export default function StarsReviewWidget({ widget, onUpdate, currentIsLight }: Props) {
  const { app } = useApp();
  const containerRef = useRef<HTMLElement>(null);
  const size = useWidgetSize(containerRef);
  const compact = size.width < 620 || size.height < 420;
  const tiny = size.width < 420 || size.height < 300;
  const [today, setToday] = useState(() => new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [presenting, setPresenting] = useState(false);
  useEffect(() => {
    const tick = () => setToday(new Date());
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    setPresenting(false);
    setShowSettings(false);
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
  const surface = currentIsLight ? 'bg-amber-50 text-slate-900' : 'bg-zinc-900 text-white';
  const button = compact ? 'min-h-11 rounded-xl border border-amber-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500' : 'min-h-11 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500';
  return <section ref={containerRef} aria-label="Sterne der Klasse im gewählten Zeitraum" className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-amber-400 ${surface}`}>
    <header className={`flex shrink-0 flex-wrap items-center justify-between border-b border-amber-400/60 ${compact ? "gap-1 p-1.5" : "gap-2 p-3"}`}>
      <div className="min-w-0">
        <h2 className={`${tiny ? "text-sm" : compact ? "text-base" : "text-lg"} font-black leading-tight`}>⭐ Unsere gesammelten Sterne</h2>
        <p className={`${tiny ? 'text-[10px]' : 'text-xs'} font-semibold opacity-80`}>
          {range ? `${formatDate(range.start)} – ${formatDate(range.end)}` : 'Bitte einen gültigen Zeitraum auswählen'}
          {' · '}{settings.subjects.length ? settings.subjects.join(', ') : 'Alle Fächer'}
        </p>
      </div>
      <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-2"}`}>
        <button type="button" className={button} aria-expanded={showSettings} onClick={() => { setShowSettings(value => !value); setPresenting(false); }}>⚙️ Einstellen</button>
        {presenting && <button type="button" className={button} onClick={() => setPresenting(false)}>🔒 Verbergen</button>}
      </div>
    </header>
    {showSettings ? <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-3" aria-label="Sterne-Auswertung konfigurieren">
      <fieldset className="flex flex-wrap gap-2"><legend className="mb-2 text-sm font-black">Zeitraum</legend>
        {([['week', 'Woche'], ['month', 'Monat'], ['custom', 'Eigene Daten']] as const).map(([period, label]) =>
          <button type="button" key={period} aria-pressed={settings.period === period} className={`${button} ${settings.period === period ? 'ring-2 ring-amber-500' : ''}`} onClick={() => update({ period })}>{label}</button>)}
      </fieldset>
      {settings.period === 'custom' ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-sm font-bold">Von <input type="date" aria-label="Sterne von" value={settings.startDate} className="mt-1 block min-h-11 w-full rounded-lg border border-amber-400 bg-white px-2 text-slate-900" onChange={e => update({ startDate: e.target.value })} /></label>
        <label className="text-sm font-bold">Bis <input type="date" aria-label="Sterne bis" value={settings.endDate} className="mt-1 block min-h-11 w-full rounded-lg border border-amber-400 bg-white px-2 text-slate-900" onChange={e => update({ endDate: e.target.value })} /></label>
      </div> : <label className="block text-sm font-bold">Woche / Monat mit diesem Datum
        <input type="date" aria-label="Referenzdatum für Stern-Auswertung" value={settings.referenceDate || starsIsoLocalDate(today)}
          onChange={e => update({ referenceDate: e.target.value })}
          className="mt-1 block min-h-11 w-full rounded-lg border border-amber-400 bg-white px-2 text-slate-900" />
        <button type="button" className={`${button} mt-2`} onClick={() => update({ referenceDate: '' })}>Aktuelle {settings.period === 'week' ? 'Woche' : 'Monat'}</button>
      </label>}
      {!range && <p role="alert" className="rounded-lg bg-rose-100 p-2 text-sm font-bold text-rose-900">Bitte gültige Anfangs- und Enddaten in der richtigen Reihenfolge eingeben.</p>}
      <fieldset className="flex flex-wrap gap-2"><legend className="mb-2 text-sm font-black">Wie viele Kinder zeigen?</legend>
        {([ [3, 'Top 3'], [10, 'Top 10'], ['all', 'Alle Kinder'] ] as const).map(([limit, label]) =>
          <button type="button" key={limit} aria-pressed={settings.limit === limit} className={`${button} ${settings.limit === limit ? 'ring-2 ring-amber-500' : ''}`} onClick={() => update({ limit })}>{label}</button>)}
      </fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-black">Fächer auswählen</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={settings.subjects.length === 0} onChange={() => update({ subjects: [] })} /> Alle Fächer (auch Einträge ohne Fach)</label>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {availableSubjects.map(subject => <label key={subject} className="flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 px-2 text-sm font-semibold">
            <input type="checkbox" checked={settings.subjects.includes(subject)} onChange={() => toggleSubject(subject)} />{subject}
          </label>)}
        </div>
        <p className="text-xs opacity-75">Einträge ohne Fach zählen nur bei „Alle Fächer“.</p>
      </fieldset>
      <button type="button" className={`${button} w-full border-amber-600 bg-amber-400`} onClick={() => setShowSettings(false)}>Einstellungen übernehmen</button>
    </div> : !presenting ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <span className="text-5xl" aria-hidden="true">🌟</span>
      <p className="max-w-md text-base font-semibold">Die Sterneauswertung ist vorbereitet. Die Namen und Punktzahlen sind erst nach deiner Freigabe auf der Tafel sichtbar.</p>
      <button type="button" disabled={!range || !children.length} className={`${button} border-amber-600 bg-amber-400 disabled:opacity-40`} onClick={() => setPresenting(true)}>⭐ Ergebnisse jetzt zeigen</button>
      {!children.length && <p className="text-sm font-semibold">In dieser Klasse sind noch keine Kinder eingetragen.</p>}
    </div> : <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compact ? "p-1.5" : "p-3"}`} aria-live="polite">
      <p className="mb-3 text-xs font-semibold opacity-80">{settings.limit === 'all' ? 'Alle Kinder' : `Top ${settings.limit}`} · {ranked.length} {ranked.length === 1 ? 'Kind' : 'Kinder'} · dokumentierte Sterne im gewählten Zeitraum</p>
      <ol className="space-y-2">{ranked.map(row => {
        const child = children.find(item => item.id === row.studentId);
        const duplicate = (duplicateFirstNames.get(row.firstName.toLocaleLowerCase('de-AT')) || 0) > 1;
        const label = duplicate && child?.nachname ? `${row.firstName} ${child.nachname.slice(0, 1)}.` : row.firstName;
        return <li key={row.studentId} className={`flex items-center justify-between rounded-xl border border-amber-300 bg-white text-slate-900 ${compact ? "min-h-10 gap-1 px-2 py-1.5" : "min-h-12 gap-3 px-3 py-2"}`}>
          <span className={`min-w-0 break-words [overflow-wrap:anywhere] font-extrabold leading-snug ${compact ? "text-sm" : "text-base"}`}><span className="mr-2 text-amber-700">{row.rank}.</span>{label}</span>
          <span className="shrink-0 text-base font-black text-amber-800" aria-label={`${row.stars} Sterne`}>⭐ {row.stars}</span>
        </li>;
      })}</ol>
    </div>}
  </section>;
}
