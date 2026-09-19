import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getStudentPerformanceSummary } from '../lib/statisticsMetrics';
import { getStudentAttendanceSummary, getStudentNotes } from '../lib/studentMetrics';

/** A compact, neutral documentation snapshot; missing notes are not a risk diagnosis. */
export default function KlassenUeberblick() {
  const { app, setPage } = useApp();
  const stats = useMemo(() => {
    const children = app.schueler || [];
    const subjects = app.faecher || Object.keys(app.notenMeta || {});
    const rows = children.map(child => {
      const grades = (['1', '2'] as const).some(semester =>
        getStudentPerformanceSummary(app, child.id, subjects, semester).hasData
      );
      const attendance = getStudentAttendanceSummary(app, child.id).hasData;
      const notes = getStudentNotes(app, child.id).length;
      const diagnostics = (app.diagnostikErhebungen || []).some(item => item.schuelerId === child.id)
        || (app.diagnosticResults || []).some(item => item.studentId === child.id);
      return { id: child.id, label: child.vorname + ' ' + child.nachname, grades, attendance, notes, diagnostics };
    });
    return {
      total: rows.length, rows,
      grades: rows.filter(row => row.grades).length,
      attendance: rows.filter(row => row.attendance).length,
      notes: rows.filter(row => row.notes > 0).length,
      diagnostics: rows.filter(row => row.diagnostics).length,
    };
  }, [app]);
  if (!stats.total) return null;
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden"
      data-testid="dashboard-klassenueberblick">
      <summary className="cursor-pointer text-sm font-black text-slate-800">
        Klassenüberblick · {stats.total} Kinder
        <span className="ml-2 text-xs font-medium text-slate-500">Dokumentation & Lernstand ansehen</span>
      </summary>
      <p className="mt-2 text-xs text-slate-600">
        Datenstand dieser Klasse, keine Bewertung der Kinder. Ohne Einträge wird keine Auffälligkeit abgeleitet.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Leistungen', stats.grades], ['Anwesenheit', stats.attendance],
          ['Beobachtungen', stats.notes], ['Diagnostik', stats.diagnostics],
        ].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <span className="block text-xs font-semibold text-slate-600">{label}</span>
          <strong className="text-base text-slate-900">{count} / {stats.total}</strong>
          <span className="block text-[11px] text-slate-500">Kinder mit Daten</span>
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setPage('schueler')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Klassenliste öffnen</button>
        <button type="button" onClick={() => setPage('noten')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Zur Notenmappe</button>
        <button type="button" onClick={() => setPage('dossier')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Schülerdossier</button>
      </div>
    </details>
  );
}
