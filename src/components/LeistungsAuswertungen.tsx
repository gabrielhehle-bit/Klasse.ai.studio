import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getClassPerformanceStats, getSubjectPerformanceAverages } from '../lib/statisticsMetrics';

export default function LeistungsAuswertungen({
  initialSubject, initialSemester, onBack,
}: { initialSubject: string; initialSemester: '1' | '2'; onBack: () => void }) {
  const { app, setPage } = useApp();
  const [subject, setSubject] = useState(initialSubject);
  const semester: '1' | '2' = '1';
  const subjects = useMemo(() => [...new Set([
    ...(app.faecher || []),
    ...Object.values(app.noten || {}).flatMap(subjectMap => Object.keys(subjectMap || {})),
  ])].filter(Boolean), [app.faecher, app.noten]);
  const chosen = subject === 'alle' ? subjects : [subject];
  const summary = getClassPerformanceStats(app, app.schueler, chosen, semester);
  const bySubject = getSubjectPerformanceAverages(app, app.schueler, chosen, semester);
  return <section className="mx-auto max-w-6xl space-y-4 p-3 md:p-6" data-testid="gradebook-auswertungen">
    <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">← Notenmappe</button>
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-black text-slate-900">Auswertungen</h2>
      <p className="mt-1 text-sm text-slate-600">Leistungsdaten aus der Notenmappe. Fächer mit unterschiedlichen Skalen werden getrennt ausgewiesen. Bei Punktebewertung liefert der Notenrechner einen aus Höchstpunkten berechneten Prozentwert.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="text-xs font-bold text-slate-700">Fach
          <select value={subject} onChange={e => setSubject(e.target.value)} className="input-field mt-1 block min-w-48">
            <option value="alle">Alle Fächer – einzeln</option>
            {subjects.map(fach => <option key={fach} value={fach}>{fach}</option>)}
          </select>
        </label>
        <span className="self-end rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Ganzes Schuljahr</span>
      </div>
    </div>
    {summary.totalCount === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-800">Noch keine auswertbaren Leistungen</h3>
      <p className="mt-1 text-sm text-slate-600">Für die gewählte Auswahl wurden noch keine Bewertungen erfasst. Die Auswertungen erscheinen nach der Notenerfassung.</p>
      <button onClick={onBack} type="button" className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Zur Notenerfassung</button>
    </div> : <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold text-slate-600">{summary.totalCount} auswertbare Fachstände · Ganzes Schuljahr</p>
        {subject !== 'alle' && <p className="mt-2 text-lg font-black text-slate-900">{summary.averageDescriptor}: {summary.averageLabel}</p>}
        {subject === 'alle' && <p className="mt-2 text-sm text-slate-600">Kein fachübergreifender Durchschnitt: Schulnoten, Punkte und Prozente sind nicht dieselbe Skala.</p>}
        {subject !== 'alle' && summary.scale !== 'mixed' && <div className="mt-4 space-y-2" aria-label={summary.distributionDescriptor}>
          {summary.distribution.map(row => <div key={row.name} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">{row.name}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-emerald-600" style={{ width: (row.count / summary.totalCount * 100) + '%' }} />
            </div>
            <span className="text-right font-bold">{row.count}</span>
          </div>)}
        </div>}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-black text-slate-800">Fachübersicht</h3>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs">
          <thead><tr className="border-b border-slate-200"><th scope="col" className="p-2">Fach</th><th scope="col" className="p-2">Skala</th><th scope="col" className="p-2">Kinder mit Daten</th><th scope="col" className="p-2">Mittelwert</th></tr></thead>
          <tbody>{bySubject.map(row => <tr key={row.subject} className="border-b border-slate-100">
            <th scope="row" className="p-2">{row.subject}</th>
            <td className="p-2">{row.mode === 'grades' ? 'Schulnote 1–5' : row.mode === 'percent' ? 'Prozent' : 'Punkte → Prozentwert'}</td>
            <td className="p-2">{row.count} / {app.schueler.length}</td>
            <td className="p-2">{row.rawAverage.toLocaleString('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{row.mode === 'percent' || row.mode === 'points' ? ' %' : ''}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </>}
    <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
      <summary className="cursor-pointer font-bold">Weitere bestehende Statistik- und Spezialwerkzeuge</summary>
      <p className="mt-2">Für seltene Spezialauswertungen bleibt die bisherige Werkzeugansicht vorübergehend zugänglich, bis ihre Funktionen einzeln zugeordnet und geprüft sind.</p>
      <button type="button" onClick={() => setPage('statistik')}
        className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold">Bisherige Spezialwerkzeuge öffnen</button>
    </details>
  </section>;
}