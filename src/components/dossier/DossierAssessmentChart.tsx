import React from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { getDossierAssessmentChart, type ChartAssessment } from '../../lib/dossierAssessmentChart';

export default function DossierAssessmentChart({ items, mode }: { items: ChartAssessment[]; mode: 'grades'|'percent'|'points' }) {
  const { rows, excludedCount } = getDossierAssessmentChart(items, mode);
  return <section data-dossier-assessment-chart className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-base font-bold text-slate-900">Notenverlauf & Einzelbewertungen</h4>
      <span className="text-xs text-slate-500">{rows.length} datierte Bewertungen</span>
    </div>
    <p className="mb-4 text-xs text-slate-500">{mode === 'grades' ? '1 = Sehr gut · 5 = Nicht genügend' : mode === 'points' ? 'Punkte auf Prozent umgerechnet, damit verschiedene Maximalpunkte vergleichbar sind' : 'Bewertung in Prozent'} · Reihenfolge nach Datum</p>
    {rows.length ? <div className="h-52 sm:h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:12,right:16,bottom:8,left:0}}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
      <XAxis dataKey="dateLabel" tick={{fontSize:11}} axisLine={false} tickLine={false} minTickGap={25}/>
      <YAxis domain={mode === 'grades' ? [1,5] : [0,100]} reversed={mode === 'grades'} ticks={mode === 'grades' ? [1,2,3,4,5] : [0,25,50,75,100]} width={36} axisLine={false} tickLine={false} tick={{fontSize:11}} tickFormatter={v=>mode === 'grades' ? String(v) : `${v}%`}/>
      <Tooltip content={({active,payload})=>{const row=payload?.[0]?.payload;return active&&row?<div className="max-w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg"><strong className="block text-slate-900">{row.label}</strong><span className="block text-slate-500">{row.dateLabel} · {row.categoryLabel}</span><span className="mt-1 block font-bold text-indigo-700">{mode === 'grades' ? `Note ${row.rawGrade}` : `${Number(row.value).toFixed(1).replace('.',',')} %`}</span></div>:null;}}/>
      <Line dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{r:4,strokeWidth:2,fill:'#ffffff'}} activeDot={{r:6}} isAnimationActive={false}/>
    </LineChart></ResponsiveContainer></div> : <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Noch keine datierten Bewertungen für einen Verlauf vorhanden.</p>}
    {rows.length===1&&<p className="mt-2 text-xs text-slate-500">Eine Bewertung zeigt einen einzelnen Punkt. Weitere Bewertungen ergänzen den Verlauf.</p>}
    {excludedCount>0&&<p className="mt-2 text-xs text-slate-500">{excludedCount} Einträge ohne gültiges Datum oder vergleichbaren Wert bleiben in der Bewertungsliste sichtbar.</p>}
  </section>;
}
