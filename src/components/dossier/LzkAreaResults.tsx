import React from 'react';
import { useApp } from '../../context/AppContext';
import { getLzkAreaRows } from '../../lib/assessmentAreas';

export default function LzkAreaResults({ studentId, subject, semester = '1' }: { studentId: string; subject?: string; semester?: string }) {
  const { app } = useApp();
  const rows = getLzkAreaRows(app, studentId, subject, semester);
  if (!rows.length) return null;
  const groups = [...new Set(rows.map(row => `${row.fach}\u0000${row.area}`))];
  return <section data-lzk-area-results className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
    <h3 className="text-sm font-bold text-slate-900">Lernzielkontrollen nach Bereichen</h3>
    {groups.map(key => {
      const group = rows.filter(row => `${row.fach}\u0000${row.area}` === key);
      const values = group.filter(row => row.value !== null);
      const average = values.length ? values.reduce((sum, row) => sum + row.value!, 0) / values.length : null;
      return <div key={key}><h4 className="text-sm font-semibold">{group[0].fach} · {group[0].area}</h4>
        <p className="text-xs text-slate-500">{values.length} bewertet{average !== null ? ` · ${group[0].mode === 'grades' ? 'Notenschnitt' : 'Durchschnitt'} ${average.toLocaleString('de-AT', { maximumFractionDigits: 1 })}${group[0].mode === 'grades' ? '' : ' %'}` : ''}</p>
        <ul className="mt-2 space-y-1">{group.map(row => <li key={row.index} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs"><span>{row.label}{row.date ? ` · ${row.date}` : ''}</span><strong>{row.display}</strong></li>)}</ul>
      </div>;
    })}
  </section>;
}
