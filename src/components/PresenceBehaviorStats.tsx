import React, { useMemo, useState } from 'react';
import { Activity, CalendarCheck2, Smile } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getClassPresenceBehaviorStats, getPresenceBehaviorStats, type PresenceBehaviorPeriod } from '../lib/presenceBehaviorStats';

export default function PresenceBehaviorStats({ studentId, compact = false }: { studentId?: string; compact?: boolean }) {
  const { app } = useApp();
  const [period, setPeriod] = useState<PresenceBehaviorPeriod>('recent');
  const stats = useMemo(() => studentId ? getPresenceBehaviorStats(app, studentId, period) : getClassPresenceBehaviorStats(app, period), [app, studentId, period]);
  const maxActivity = Math.max(1, ...stats.weeks.flatMap(week => [week.attendancePresent + week.attendanceAbsent, week.behaviorTotal]));
  const title = studentId ? 'Verhalten & Anwesenheit' : 'Ich bin da · Statistik';

  return (
    <section data-presence-behavior-stats className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4 sm:p-5'} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Activity size={16} className="text-indigo-600" /><h3 className="text-sm font-semibold text-slate-900">{title}</h3></div>
          <p className="mt-1 text-xs font-medium text-slate-500">Wochenverlauf und Schuljahr getrennt auswerten</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Statistikzeitraum">
          {([['recent', 'Letzte 6 Wochen'], ['year', 'Gesamtes Schuljahr']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={period === key} onClick={() => setPeriod(key)} className={`min-h-10 rounded-lg px-2.5 text-[0.68rem] font-bold ${period === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-3"><div className="flex items-center gap-1 text-[0.65rem] font-bold uppercase text-emerald-700"><CalendarCheck2 size={13} /> Da</div><strong className="mt-1 block text-xl text-emerald-900">{stats.attendancePresent}</strong></div>
        <div className="rounded-xl bg-rose-50 p-3"><div className="text-[0.65rem] font-bold uppercase text-rose-700">Abwesend</div><strong className="mt-1 block text-xl text-rose-900">{stats.attendanceAbsent}</strong></div>
        <div className="rounded-xl bg-indigo-50 p-3"><div className="text-[0.65rem] font-bold uppercase text-indigo-700">Verhalten</div><strong className="mt-1 block text-xl text-indigo-900">{stats.behaviorTotal}</strong></div>
        <div className="rounded-xl bg-amber-50 p-3"><div className="flex items-center gap-1 text-[0.65rem] font-bold uppercase text-amber-700"><Smile size={13} /> Befinden</div><strong className="mt-1 block text-xl text-amber-900">{stats.moodAverage ?? '–'}</strong></div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[28rem] items-end gap-2" aria-label={`${title} Wochenverlauf`}>
          {stats.weeks.length ? stats.weeks.map(week => { const presence = week.attendancePresent + week.attendanceAbsent; return <div key={week.key} className="flex min-w-12 flex-1 flex-col items-center gap-1"><div className="flex h-24 items-end gap-1"><div title={`${week.attendancePresent} Tage da`} className="w-3 rounded-t bg-emerald-400" style={{ height: `${Math.max(4, (week.attendancePresent / maxActivity) * 100)}%` }} /><div title={`${week.behaviorTotal} Verhaltenseinträge`} className="w-3 rounded-t bg-indigo-400" style={{ height: `${Math.max(4, (week.behaviorTotal / maxActivity) * 100)}%` }} /></div><span className="text-[0.62rem] font-semibold text-slate-500">{week.label}</span><span className="text-[0.58rem] text-slate-400">{presence || week.behaviorTotal || '–'}</span></div>; }) : <p className="w-full py-5 text-center text-xs font-medium text-slate-500">Noch keine Verlaufsdaten vorhanden.</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-semibold text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Anwesenheit</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />Verhaltensereignisse</span><span>{stats.behaviorPositive} positiv · {stats.behaviorGuidance} Begleitung</span></div>
    </section>
  );
}
