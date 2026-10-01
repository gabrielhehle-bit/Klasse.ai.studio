import React from 'react';
import { useApp } from '../../context/AppContext';
import { aggregateStarsReview, DEFAULT_STARS_REVIEW_SETTINGS, starsReviewSubjects, starsReviewRange, type StarsPeriod } from '../../lib/starsReview';

export default function SidebarStarsOverview() {
  const { app, setApp } = useApp();
  const key = app.activeClassId || 'default';
  const saved = app.boardSettings?.sidebarStarsByClass?.[key];
  const selection = saved?.selection || 'all';
  const period = saved?.period || 'all';
  const settings = { ...DEFAULT_STARS_REVIEW_SETTINGS, period, limit: 'all' as const,
    subjects: selection.startsWith('subject:') ? [selection.slice(8)] : [],
    category: selection.startsWith('subject:') ? 'subject' as const : selection as 'all' | 'social' | 'unassigned',
    schoolYear: app.schuljahr, bundesland: app.bundesland };
  const rows = aggregateStarsReview(app.schueler, app.mitarbeitLogs || [], settings);
  const range = starsReviewRange(settings);
  const subjects = starsReviewSubjects(app.mitarbeitLogs || [], app.schueler, app.faecher);
  const update = (patch: { selection?: string; period?: StarsPeriod }) => setApp(previous => ({ ...previous, boardSettings: {
    ...previous.boardSettings, sidebarStarsByClass: { ...previous.boardSettings?.sidebarStarsByClass,
      [key]: { selection, period, ...patch } },
  } }));
  const maximum = Math.max(1, ...rows.map(row => row.stars));
  return <section aria-label="Gesammelte Sterne" className="flex h-full min-h-0 flex-col gap-2 text-slate-900">
    <label className="text-xs font-semibold">Sterne auswählen<select aria-label="Sterne auswählen" value={selection} onChange={event => update({ selection: event.target.value })} className="mt-1 min-h-9 w-full rounded-lg border bg-white px-2">
      <option value="all">Alle Sterne</option><option value="unassigned">Fachunabhängig</option><option value="social">Sozial</option>
      {subjects.map(subject => <option key={subject} value={`subject:${subject}`}>{subject}</option>)}
    </select></label>
    <label className="text-xs font-semibold">Zeitraum<select aria-label="Zeitraum der Sterne" value={period} onChange={event => update({ period: event.target.value as StarsPeriod })} className="mt-1 min-h-9 w-full rounded-lg border bg-white px-2">
      <option value="all">Gesamt</option><option value="month">Monat</option><option value="semester">Semester</option><option value="week">Woche</option>
    </select></label>
    <p className="text-xs"><strong>⭐ {rows.reduce((sum, row) => sum + row.stars, 0)} Sterne</strong>{period !== 'all' && range && <span className="block text-slate-500">{range.start.split('-').reverse().join('.')} – {range.end.split('-').reverse().join('.')}</span>}</p>
    <div role="img" aria-label="Balkendiagramm der gesammelten Sterne pro Kind" className="min-h-0 flex-1 overflow-y-auto space-y-2">
      {rows.map(row => <div key={row.studentId} aria-label={`${row.firstName}: ${row.stars} Sterne`}>
        <div className="flex justify-between gap-2 text-xs"><span className="break-words font-semibold">{row.firstName}</span><span className="shrink-0">⭐ {row.stars}</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-amber-400" style={{ width: `${100 * row.stars / maximum}%` }} /></div>
      </div>)}
      {!rows.length && <p className="text-xs text-slate-500">In dieser Klasse sind noch keine Kinder eingetragen.</p>}
    </div>
    <p className="text-[10px] text-slate-500">Fachsterne zählen auch in der Notenmappe. Sozialsterne bleiben getrennt.</p>
  </section>;
}
