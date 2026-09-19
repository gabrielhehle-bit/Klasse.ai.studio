import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import AntolinImportModal from './AntolinImportModal';
import type { AntolinRecord } from '../types';

function safeTotal(value: number): string { return Number.isFinite(value) ? value.toLocaleString('de-AT') : '–'; }

/** One class-local Antolin view, also embedded in each child's Dossier. */
export default function AntolinBereich({ studentId }: { studentId?: string } = {}) {
  const { app } = useApp();
  const [showImport, setShowImport] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const students = app.schueler || [];
  const activeId = studentId || selectedId;
  const data = useMemo(() => {
    const ids = new Set(students.map(s => s.id));
    const records = (app.antolinRecords || [])
      .filter(r => ids.has(r.schuelerId) && (!r.classId || r.classId === app.activeClassId))
      .sort((a, b) => b.datum.localeCompare(a.datum));
    const latestByStudent = new Map<string, AntolinRecord>();
    for (const record of records) if (!latestByStudent.has(record.schuelerId)) latestByStudent.set(record.schuelerId, record);
    const latest = [...latestByStudent.values()];
    const totals = {
      students: latest.length,
      books: latest.reduce((sum, rec) => sum + rec.anzahlBuecher, 0),
      points: latest.reduce((sum, rec) => sum + rec.punkte, 0),
    };
    return { records, latestByStudent, totals };
  }, [app.antolinRecords, app.activeClassId, students]);
  const activeStudent = students.find(s => s.id === activeId);
  const activeRecords = data.records.filter(r => r.schuelerId === activeId);
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
    data-testid={studentId ? 'dossier-antolin' : 'class-antolin'}>
    <AntolinImportModal open={showImport} onClose={() => setShowImport(false)} />
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-slate-900">Lesen & Antolin</h2>
        <p className="text-xs text-slate-600">Dokumentierte Leseberichte dieser Klasse, kein automatisches Urteil über Lesekompetenz.</p>
      </div>
      <button type="button" onClick={() => setShowImport(true)}
        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
        Antolin-Bericht importieren
      </button>
    </header>
    {!studentId && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3 text-xs">Kinder mit Antolin-Bericht <strong className="block text-xl">{data.totals.students} / {students.length}</strong></div>
      {data.totals.students > 0 && <>
        <div className="rounded-xl bg-slate-50 p-3 text-xs">Bücher laut jüngstem Bericht je Kind<strong className="block text-xl">{safeTotal(data.totals.books)}</strong></div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs">Punkte laut jüngstem Bericht je Kind<strong className="block text-xl">{safeTotal(data.totals.points)}</strong></div>
      </>}
    </div>}
    {!studentId && <label className="block text-xs font-bold text-slate-700">
      Individuellen Lesebericht öffnen
      <select className="input-field mt-1 w-full" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        <option value="">Kind auswählen …</option>
        {[...students].sort((a,b) => a.nachname.localeCompare(b.nachname, 'de')).map(s =>
          <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
      </select>
    </label>}
    {activeStudent && <div className="space-y-3">
      <h3 className="text-sm font-black text-slate-900">{activeStudent.vorname} {activeStudent.nachname} · Leseberichte</h3>
      {activeRecords.length ? <>
        <p className="text-xs text-slate-600">Bücher und Punkte sind Berichtsstände. Mehrere Berichte desselben Kindes werden nicht zusammengezählt.</p>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs">
          <thead><tr className="border-b border-slate-200 text-slate-600"><th scope="col" className="p-2">Datum</th><th scope="col" className="p-2">Bücher</th><th scope="col" className="p-2">Punkte</th><th scope="col" className="p-2">Lösungsquote</th><th scope="col" className="p-2">Schwierigkeit</th></tr></thead>
          <tbody>{activeRecords.map(record => <tr key={record.id} className="border-b border-slate-100">
            <td className="p-2">{record.datum}</td><td className="p-2">{safeTotal(record.anzahlBuecher)}</td>
            <td className="p-2">{safeTotal(record.punkte)}</td><td className="p-2">{Number.isFinite(record.leistung) ? record.leistung.toLocaleString('de-AT') + ' %' : '–'}</td>
            <td className="p-2">{Number.isFinite(record.schwierigkeit) ? record.schwierigkeit.toLocaleString('de-AT') : '–'}</td>
          </tr>)}</tbody>
        </table></div>
      </> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Für dieses Kind liegen noch keine Antolin-Berichte vor.</p>}
    </div>}
    {!data.records.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Noch keine Antolin-Berichte für diese Klasse vorhanden. Du kannst einen Bericht importieren.</p>}
  </section>;
}
