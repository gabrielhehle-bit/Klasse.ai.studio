import React, { useState } from 'react';
import type { AppState } from '../../types';
import { aggregateStarsReview, DEFAULT_STARS_REVIEW_SETTINGS, starsReviewRange, type StarsPeriod } from '../../lib/starsReview';

export default function ParticipationOverview({ app, subject }: { app: AppState; subject: string }) {
  const [period, setPeriod] = useState<StarsPeriod>('all');
  const settings = { ...DEFAULT_STARS_REVIEW_SETTINGS, period, limit: 'all' as const,
    subjects: [subject], category: 'subject' as const, schoolYear: app.schuljahr, bundesland: app.bundesland };
  const logged = aggregateStarsReview(app.schueler, app.mitarbeitLogs || [], settings);
  const rows = app.schueler.map(student => ({ id: student.id, name: `${student.vorname} ${student.nachname}`.trim(),
    points: period === 'all' ? (app.mitarbeit?.[student.id]?.[subject]?.['1'] || 0)
      : (logged.find(row => row.studentId === student.id)?.stars || 0),
  }));
  const range = starsReviewRange(settings);
  const maximum = Math.max(1, ...rows.map(row => row.points));
  return <section aria-label="Mitarbeit im Zeitraum" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-bold text-slate-900">Mitarbeit im Zeitraum · {subject}</h3>
        <p className="mt-1 text-xs text-slate-600"><strong data-participation-period-total>{rows.reduce((sum, row) => sum + row.points, 0)} Fachpunkte</strong>
          {period !== 'all' && range && ` · ${range.start.split('-').reverse().join('.')} – ${range.end.split('-').reverse().join('.')}`}</p></div>
      <label className="text-xs font-semibold text-slate-600">Zeitraum
        <select aria-label="Zeitraum der Mitarbeit" className="ml-2 min-h-9 rounded-lg border border-slate-200 bg-white px-2" value={period} onChange={event => setPeriod(event.target.value as StarsPeriod)}>
          <option value="all">Gesamt</option><option value="month">Monat</option><option value="semester">Semester</option><option value="week">Woche</option>
        </select></label>
    </div>
    <div role="img" aria-label="Mitarbeitspunkte pro Kind im gewählten Zeitraum" className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(row => <div key={row.id} aria-label={`${row.name}: ${row.points} Fachpunkte`}>
        <div className="flex justify-between gap-2 text-xs text-slate-700"><span className="min-w-0 break-words">{row.name}</span><strong>{row.points}</strong></div>
        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${100 * row.points / maximum}%` }} /></div>
      </div>)}
      {!rows.length && <p className="text-xs text-slate-500">Noch keine Kinder eingetragen.</p>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Gesamt zeigt den gespeicherten Fachzähler. Monat, Semester und Woche zeigen protokollierte Fachpunkte einschließlich Korrekturen. Ältere Punkte ohne Datum erscheinen nur unter Gesamt. Sozialsterne bleiben getrennt.</p>
  </section>;
}
